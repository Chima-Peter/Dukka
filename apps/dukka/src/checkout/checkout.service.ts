import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {
    OrderPaymentAttemptStatus,
    Prisma,
    RedisService,
    type BillingAddress,
    type CustomerJwtPayload,
    type ShippingAddress,
} from '@app/common';
import { GENERAL_JOBS, GeneralQueueService } from '@app/queues';
import { BillingAddressService } from '../address/billing-address.service.js';
import { ShippingAddressService } from '../address/shipping-address.service.js';
import { CartService } from '../cart/cart.service.js';
import type { CartItemView, CartView } from '../cart/types/cart.type.js';
import { CustomerService } from '../customer/customer.service.js';
import { IDEMPOTENCY_KEY_CONFLICT } from '../orders/constants/order.constants.js';
import { OrdersService } from '../orders/orders.service.js';
import type {
    CreateOrderBase,
    CreateOrderItemInput,
    OrderAddressSnapshot,
} from '../orders/types/create-order.type.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PaystackService } from '../payments/providers/index.js';
import { PointsService } from '../points/points.service.js';
import { computeDiscountAmount } from '../promotions/utils/compute-discount-amount.js';
import { ServiceStateService } from '../service/service-state.service.js';
import {
    ORDER_IDEMPOTENCY_COMPLETED_TTL_SECONDS,
    ORDER_IDEMPOTENCY_KEY_MAX_LENGTH,
    ORDER_IDEMPOTENCY_PROCESSING_TTL_SECONDS,
    RedisKeys,
} from '../shared/index.js';
import { CheckoutRepository } from './checkout.repository.js';
import type { CheckoutDto } from './dto/checkout.dto.js';
import type {
    BillBreakdown,
    CheckoutResult,
    ResolvedAddresses,
} from './types/checkout.type.js';
import type { PrecheckoutView } from './types/precheckout.type.js';

@Injectable()
export class CheckoutService {
    private readonly logger = new Logger(CheckoutService.name);

    constructor(
        private readonly shippingAddressService: ShippingAddressService,
        private readonly billingAddressService: BillingAddressService,
        private readonly pointsService: PointsService,
        private readonly cartService: CartService,
        private readonly customerService: CustomerService,
        private readonly paymentsService: PaymentsService,
        private readonly serviceStateService: ServiceStateService,
        private readonly paystackService: PaystackService,
        private readonly checkoutRepository: CheckoutRepository,
        private readonly generalQueueService: GeneralQueueService,
        private readonly redisService: RedisService,
        private readonly ordersService: OrdersService,
    ) {}

    async getPrecheckout(
        customer: CustomerJwtPayload | undefined,
        guestCartId?: string,
    ): Promise<PrecheckoutView> {
        if (customer) {
            return this.getCustomerPrecheckout(customer.sub, customer.cart_id);
        }

        if (guestCartId === undefined) {
            throw new BadRequestException(
                'cart_id is required for guest precheckout',
            );
        }

        return this.getGuestPrecheckout(guestCartId);
    }

    async checkout(
        customer: CustomerJwtPayload | undefined,
        data: CheckoutDto,
        idempotencyKeyHeader?: string,
    ): Promise<CheckoutResult> {
        try {
            const idempotencyKey =
                this.requireIdempotencyKey(idempotencyKeyHeader);
            const pointsRequested = data.points ?? 0;

            return await this.withIdempotency(idempotencyKey, async () => {
                if (customer) {
                    return await this.checkoutForCustomer(
                        customer,
                        data,
                        pointsRequested,
                        idempotencyKey,
                    );
                }

                if (data.cart_id === undefined) {
                    throw new BadRequestException(
                        'cart_id is required for guest checkout',
                    );
                }

                if (pointsRequested > 0) {
                    throw new BadRequestException(
                        'Guests cannot redeem points',
                    );
                }

                return await this.checkoutForGuest(
                    data,
                    pointsRequested,
                    idempotencyKey,
                );
            });
        } catch (error) {
            this.handleError(error);
        }
    }

    private async checkoutForCustomer(
        customer: CustomerJwtPayload,
        data: CheckoutDto,
        pointsRequested: number,
        idempotencyKey: string,
    ): Promise<CheckoutResult> {
        this.logger.log(`Starting checkout for customer ${customer.sub}`);

        const cart = await this.cartService.getForCustomerWithSyncedTotal(
            customer.cart_id,
        );
        this.assertCartReady(cart);

        const addresses = await this.resolveCustomerAddresses(
            customer.sub,
            data.shipping_address_id,
            data.billing_address_id,
        );

        return this.finalizeCheckout({
            cart,
            addresses,
            paymentMethodId: data.payment_method_id,
            pointsRequested,
            customerId: customer.sub,
            cartId: customer.cart_id,
            idempotencyKey,
        });
    }

    private async checkoutForGuest(
        data: CheckoutDto,
        pointsRequested: number,
        idempotencyKey: string,
    ): Promise<CheckoutResult> {
        const cartId = data.cart_id!;
        this.logger.log(`Starting checkout for guest cart ${cartId}`);

        const cart =
            await this.cartService.getForGuestWithSyncedTotal(cartId);
        this.assertCartReady(cart);

        const addresses = await this.resolveGuestAddresses(
            data.shipping_address_id,
            data.billing_address_id,
        );

        return this.finalizeCheckout({
            cart,
            addresses,
            paymentMethodId: data.payment_method_id,
            pointsRequested,
            customerId: undefined,
            cartId,
            idempotencyKey,
        });
    }

    private async finalizeCheckout(input: {
        cart: CartView;
        addresses: ResolvedAddresses;
        paymentMethodId: string;
        pointsRequested: number;
        customerId: string | undefined;
        cartId: string;
        idempotencyKey: string;
    }): Promise<CheckoutResult> {
        const marketId = input.cart.market_id!;
        const [warehouse, paymentMethod, bill] = await Promise.all([
            this.serviceStateService.findWarehouseCoveringState(
                input.addresses.shipping.state,
            ),
            this.paymentsService.findMarketPaymentMethod(
                input.paymentMethodId,
                marketId,
            ),
            this.buildBill(
                input.cart,
                input.pointsRequested,
                input.customerId,
            ),
        ]);
        if (warehouse.country.market_id !== marketId) {
            throw new BadRequestException(
                'Warehouse covering this state does not belong to the cart market',
            );
        }

        const methodName = paymentMethod.payment_method.name.toLowerCase();
        const isCash = methodName === 'cash';
        const isPaystack = methodName === 'paystack';
        if (!isCash && !isPaystack) {
            throw new BadRequestException(
                `Unsupported payment method: ${paymentMethod.payment_method.name}`,
            );
        }

        const orderInput = this.toCreateOrderBase(
            input,
            bill,
            marketId,
            warehouse.id,
        );

        let authorizationUrl: string | null = null;
        let paymentIntentId: string | undefined;
        let paymentIntentUrl: string | undefined;

        if (isPaystack) {
            let init;
            try {
                init = await this.paystackService.initializeTransaction({
                    email: input.addresses.shipping.email,
                    amount: Math.round(bill.total_amount * 100),
                    currency: bill.currency,
                    metadata: {
                        market_id: marketId,
                        cart_id: input.cartId,
                        points_redeemed: bill.points_to_redeem,
                        idempotency_key: input.idempotencyKey,
                        ...(input.customerId
                            ? { customer_id: input.customerId }
                            : {
                                  guest_email: input.addresses.shipping.email,
                              }),
                    },
                });
            } catch (error) {
                this.logger.error(
                    `Paystack initialize failed for cart ${input.cartId}: ${error}`,
                );
                throw new InternalServerErrorException(
                    'Paystack initialization failed. Try again later',
                );
            }

            if (!init.authorization_url || !init.reference) {
                throw new BadGatewayException(
                    'Paystack initialization returned an incomplete response. Try again later',
                );
            }

            authorizationUrl = init.authorization_url;
            paymentIntentId = init.reference;
            paymentIntentUrl = init.authorization_url;
        }

        let placed;
        try {
            placed = await this.checkoutRepository.place({
                order: orderInput,
                market_id: marketId,
                warehouse_id: warehouse.id,
                cart_id: input.cartId,
                reserve_items: input.cart.items.map((item) => ({
                    market_variant_id: item.market_variant_id,
                    quantity: item.quantity,
                })),
                points_to_redeem: bill.points_to_redeem,
                customer_id: input.customerId,
                market_payment_method_id: paymentMethod.id,
                payment_method_name: paymentMethod.payment_method.name,
                payment_attempt_status: isCash
                    ? OrderPaymentAttemptStatus.SUCCESS
                    : OrderPaymentAttemptStatus.PENDING,
                order_status_processing: isCash,
                ...(paymentIntentId !== undefined && {
                    payment_intent_id: paymentIntentId,
                }),
                ...(paymentIntentUrl !== undefined && {
                    payment_intent_url: paymentIntentUrl,
                }),
            });
        } catch (error) {
            if (this.isIdempotencyKeyConflict(error)) {
                return await this.loadCheckoutResultByIdempotencyKey(
                    input.idempotencyKey,
                );
            }
            throw error;
        }

        if (isCash) {
            await this.generalQueueService.enqueue(
                GENERAL_JOBS.ORDER_PROCESSING,
                { order_id: placed.order.id },
            );
        }

        this.logger.log(`Checkout completed for order ${placed.order.id}`);

        return {
            order: placed.order,
            payment_attempt: placed.payment_attempt,
            authorization_url: authorizationUrl,
        };
    }

    private requireIdempotencyKey(header?: string): string {
        const key = header?.trim();
        if (!key) {
            throw new BadRequestException(
                'Idempotency-Key header is required',
            );
        }
        if (key.length > ORDER_IDEMPOTENCY_KEY_MAX_LENGTH) {
            throw new BadRequestException(
                `Idempotency-Key must be at most ${ORDER_IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
            );
        }
        return key;
    }

    private async withIdempotency(
        idempotencyKey: string,
        run: () => Promise<CheckoutResult>,
    ): Promise<CheckoutResult> {
        const resultKey = RedisKeys.orderIdempotency(idempotencyKey);
        const lockKey = RedisKeys.orderIdempotencyLock(idempotencyKey);

        const existing =
            await this.redisService.getObject<CheckoutResult>(resultKey);
        if (existing) {
            this.logger.log(
                `Replaying checkout for idempotency key ${idempotencyKey}`,
            );
            return existing;
        }

        const lockToken = await this.redisService.lock(
            lockKey,
            ORDER_IDEMPOTENCY_PROCESSING_TTL_SECONDS * 1000,
        );

        if (!lockToken) {
            const raced =
                await this.redisService.getObject<CheckoutResult>(resultKey);
            if (raced) {
                return raced;
            }
            throw new ConflictException('Checkout already in progress');
        }

        try {
            const afterLock =
                await this.redisService.getObject<CheckoutResult>(resultKey);
            if (afterLock) {
                return afterLock;
            }

            try {
                const result = await run();
                await this.redisService.setObject(
                    resultKey,
                    result,
                    ORDER_IDEMPOTENCY_COMPLETED_TTL_SECONDS,
                );
                return result;
            } catch (error) {
                if (this.isIdempotencyKeyConflict(error)) {
                    const result =
                        await this.loadCheckoutResultByIdempotencyKey(
                            idempotencyKey,
                        );
                    await this.redisService.setObject(
                        resultKey,
                        result,
                        ORDER_IDEMPOTENCY_COMPLETED_TTL_SECONDS,
                    );
                    return result;
                }
                throw error;
            }
        } finally {
            await this.redisService.unlock(lockKey, lockToken);
        }
    }

    private isIdempotencyKeyConflict(error: unknown): boolean {
        if (!(error instanceof ConflictException)) {
            return false;
        }

        const response = error.getResponse();
        if (typeof response === 'string') {
            return response === IDEMPOTENCY_KEY_CONFLICT;
        }

        if (
            typeof response === 'object' &&
            response !== null &&
            'code' in response
        ) {
            return (
                (response as { code?: string }).code ===
                IDEMPOTENCY_KEY_CONFLICT
            );
        }

        return false;
    }

    private async loadCheckoutResultByIdempotencyKey(
        idempotencyKey: string,
    ): Promise<CheckoutResult> {
        const order =
            await this.ordersService.findByIdempotencyKey(idempotencyKey);
        if (!order) {
            throw new NotFoundException(
                'Order for idempotency key not found',
            );
        }

        const paymentAttempt =
            await this.paymentsService.findAttemptByOrderId(order.id);
        if (!paymentAttempt) {
            throw new NotFoundException(
                'Payment attempt for idempotent order not found',
            );
        }

        return {
            order,
            payment_attempt: paymentAttempt,
            authorization_url: paymentAttempt.payment_intent_url ?? null,
        };
    }

    private toCreateOrderBase(
        input: {
            addresses: ResolvedAddresses;
            customerId: string | undefined;
            idempotencyKey: string;
        },
        bill: BillBreakdown,
        marketId: string,
        warehouseId: string,
    ): CreateOrderBase {
        const shippingSnapshot = this.toOrderAddressSnapshot(
            input.addresses.shipping,
        );
        const billingSnapshot = this.toOrderAddressSnapshot(
            input.addresses.billing,
        );

        if (input.customerId) {
            return {
                currency: bill.currency,
                subtotal: bill.subtotal,
                shipping_fee: bill.shipping_fee,
                discount_amount: bill.discount_amount,
                points_discount: bill.points_discount,
                coupon_discount: bill.coupon_discount,
                total_amount: bill.total_amount,
                market_id: marketId,
                warehouse_id: warehouseId,
                idempotency_key: input.idempotencyKey,
                items: bill.items,
                shipping_address: shippingSnapshot,
                billing_address: billingSnapshot,
                customer_id: input.customerId,
            };
        }

        const guestName =
            `${input.addresses.shipping.first_name} ${input.addresses.shipping.last_name}`.trim();

        return {
            currency: bill.currency,
            subtotal: bill.subtotal,
            shipping_fee: bill.shipping_fee,
            discount_amount: bill.discount_amount,
            points_discount: bill.points_discount,
            coupon_discount: bill.coupon_discount,
            total_amount: bill.total_amount,
            market_id: marketId,
            warehouse_id: warehouseId,
            idempotency_key: input.idempotencyKey,
            items: bill.items,
            guest_email: input.addresses.shipping.email,
            guest_name: guestName,
            guest_phone_number: input.addresses.shipping.phone_number,
            shipping_address: {
                name: guestName,
                email: input.addresses.shipping.email,
                phone_number: input.addresses.shipping.phone_number,
                country: input.addresses.shipping.country,
                state: input.addresses.shipping.state,
                market_id: marketId,
                street_address: input.addresses.shipping.street_address,
            },
            billing_address: {
                name: `${input.addresses.billing.first_name} ${input.addresses.billing.last_name}`.trim(),
                email: input.addresses.billing.email,
                phone_number: input.addresses.billing.phone_number,
                country: input.addresses.billing.country,
                state: input.addresses.billing.state,
                market_id: marketId,
                street_address: input.addresses.billing.street_address,
            },
        };
    }

    private async resolveCustomerAddresses(
        customerId: string,
        shippingAddressId: string,
        billingAddressId: string | null | undefined,
    ): Promise<ResolvedAddresses> {
        if (billingAddressId === null || billingAddressId === undefined) {
            const shipping = await this.shippingAddressService.findOne(
                customerId,
                shippingAddressId,
            );
            return { shipping, billing: shipping };
        }

        const [shipping, billing] = await Promise.all([
            this.shippingAddressService.findOne(customerId, shippingAddressId),
            this.billingAddressService.findOne(customerId, billingAddressId),
        ]);
        return { shipping, billing };
    }

    private async resolveGuestAddresses(
        shippingAddressId: string,
        billingAddressId: string | null | undefined,
    ): Promise<ResolvedAddresses> {
        const shipping =
            await this.shippingAddressService.findById(shippingAddressId);
        if (shipping.customer_id !== null) {
            throw new NotFoundException('Shipping address not found');
        }

        if (billingAddressId === null || billingAddressId === undefined) {
            return { shipping, billing: shipping };
        }

        const billing = await this.billingAddressService.findGuestByIdAndEmail(
            billingAddressId,
            shipping.email,
        );
        return { shipping, billing };
    }

    private assertCartReady(cart: CartView): void {
        if (cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }
        if (!cart.market_id) {
            throw new BadRequestException(
                'Cart has no items to resolve market',
            );
        }
        if (cart.items.some((item) => item.sold_out)) {
            throw new BadRequestException(
                'Cart contains sold out items',
            );
        }
    }

    private async buildBill(
        cart: CartView,
        pointsRequested: number,
        customerId: string | undefined,
    ): Promise<BillBreakdown> {
        const items: CreateOrderItemInput[] = [];
        let subtotal = new Prisma.Decimal(0);
        let discountAmount = new Prisma.Decimal(0);
        let currency = cart.items[0]?.currency;

        for (const item of cart.items) {
            if (currency === undefined) {
                currency = item.currency;
            } else if (currency !== item.currency) {
                throw new BadRequestException(
                    'Cart items must share the same currency',
                );
            }

            const unitDiscount = this.itemUnitDiscount(item);
            const lineDiscount = unitDiscount.mul(item.quantity);
            const unitPrice = item.price.minus(unitDiscount);
            const lineTotal = unitPrice.mul(item.quantity);

            discountAmount = discountAmount.plus(lineDiscount);
            subtotal = subtotal.plus(lineTotal);

            items.push({
                market_variant_id: item.market_variant_id,
                quantity: item.quantity,
                price: Number(item.price.toString()),
                total: Number(lineTotal.toString()),
                discount_type: item.discount?.type ?? null,
                discount_value:
                    item.discount !== null
                        ? Number(item.discount.value.toString())
                        : null,
                max_discount_amount:
                    item.discount !== null
                        ? Number(item.discount.max_discount_amount.toString())
                        : null,
                discount_amount: Number(unitDiscount.toString()),
                promotion_market_id: item.promotion_market_id,
                product_name: item.product_name,
                product_image: item.product_image,
                product_specs: item.product_specs,
            });
        }

        if (!currency) {
            throw new BadRequestException('Cart currency could not be resolved');
        }

        const shippingFee = 0;
        const payableBeforePoints = subtotal.plus(shippingFee);
        let pointsToRedeem = pointsRequested;

        if (pointsToRedeem > 0) {
            if (!customerId) {
                throw new BadRequestException('Guests cannot redeem points');
            }
            const balance = await this.pointsService.getBalance(customerId);
            if (pointsToRedeem > balance) {
                throw new BadRequestException('Insufficient points balance');
            }
            pointsToRedeem = Math.min(
                pointsToRedeem,
                Number(payableBeforePoints.toString()),
            );
        }

        const pointsDiscount = new Prisma.Decimal(pointsToRedeem);
        const totalAmount = Prisma.Decimal.max(
            payableBeforePoints.minus(pointsDiscount),
            new Prisma.Decimal(0),
        );

        return {
            currency,
            subtotal: Number(subtotal.toString()),
            shipping_fee: shippingFee,
            discount_amount: Number(discountAmount.toString()),
            points_discount: Number(pointsDiscount.toString()),
            coupon_discount: 0,
            total_amount: Number(totalAmount.toString()),
            points_to_redeem: pointsToRedeem,
            items,
        };
    }

    private itemUnitDiscount(item: CartItemView): Prisma.Decimal {
        if (item.discount === null) {
            return new Prisma.Decimal(0);
        }
        return computeDiscountAmount(
            item.discount.type,
            item.discount.value,
            item.discount.max_discount_amount,
            item.price,
        );
    }

    private toOrderAddressSnapshot(
        address: ShippingAddress | BillingAddress,
    ): OrderAddressSnapshot {
        return {
            first_name: address.first_name,
            last_name: address.last_name,
            email: address.email,
            phone_number: address.phone_number,
            whatsapp_number: address.whatsapp_number,
            country: address.country,
            state: address.state,
            market_id: address.market_id,
            street_address: address.street_address,
        };
    }

    private async getCustomerPrecheckout(
        customerId: string,
        cartId: string,
    ): Promise<PrecheckoutView> {
        try {
            this.logger.log(
                `Fetching precheckout data for customer ${customerId}`,
            );

            const [
                shipping_addresses,
                billing_addresses,
                points_balance,
                cart,
            ] = await Promise.all([
                this.shippingAddressService.findAll(customerId),
                this.billingAddressService.findAll(customerId),
                this.pointsService.getBalance(customerId),
                this.cartService.getForCustomerWithSyncedTotal(cartId),
            ]);

            const marketId =
                cart.market_id ??
                (await this.customerService.getActiveMarketId(customerId));
            if (!marketId) {
                throw new BadRequestException('Active market is not set');
            }

            const payment_methods =
                await this.paymentsService.findAvailableForMarket(marketId);

            this.logger.log(
                `Fetched precheckout data for customer ${customerId}`,
            );

            return {
                shipping_addresses: shipping_addresses ?? [],
                billing_addresses: billing_addresses ?? [],
                points_balance,
                payment_methods,
                cart,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async getGuestPrecheckout(
        cartId: string,
    ): Promise<PrecheckoutView> {
        try {
            this.logger.log(`Fetching precheckout data for guest cart ${cartId}`);

            const cart =
                await this.cartService.getForGuestWithSyncedTotal(cartId);

            if (!cart.market_id) {
                throw new BadRequestException(
                    'Cart has no items to resolve market',
                );
            }

            const payment_methods =
                await this.paymentsService.findAvailableForMarket(
                    cart.market_id,
                );

            this.logger.log(`Fetched precheckout data for guest cart ${cartId}`);

            return {
                shipping_addresses: [],
                billing_addresses: [],
                points_balance: 0,
                payment_methods,
                cart,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            throw error;
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
