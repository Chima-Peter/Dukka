import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import type { CustomerJwtPayload } from '@app/common';
import { BillingAddressService } from '../address/billing-address.service.js';
import { ShippingAddressService } from '../address/shipping-address.service.js';
import { CartService } from '../cart/cart.service.js';
import { CustomerService } from '../customer/customer.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PointsService } from '../points/points.service.js';
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
