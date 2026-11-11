import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    OrderStatus,
    Prisma,
    type Order,
} from '@app/common';
import {
    GENERAL_JOBS,
    GeneralQueueService,
} from '@app/queues';
import {
    ACCESS_CONTROL_ERROR,
    assertActorBelongsToMarkets,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { FindOrdersDto } from './dto/find-orders.dto.js';
import type { FindStaffOrdersDto } from './dto/find-staff-orders.dto.js';
import {
    toCustomerOrderDetail,
    toStaffOrderDetail,
} from './mappers/order.mapper.js';
import { OrdersRepository } from './orders.repository.js';
import type {
    CreateGuestOrderInput,
    CreateOrderBase,
    CreateOrderInput,
} from './types/create-order.type.js';
import {
    IDEMPOTENCY_KEY_CONFLICT,
    IDEMPOTENCY_KEY_CONFLICT_MESSAGE,
} from './constants/order.constants.js';
import type {
    CustomerOrderDetail,
    OrderSummaryPage,
    StaffOrderDetail,
    TransitionedOrder,
} from './types/order.type.js';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly generalQueueService: GeneralQueueService,
    ) {}

    async createForCustomer(
        customerId: string,
        data: CreateOrderInput,
    ): Promise<Order> {
        try {
            this.logger.log(`Creating order for customer ${customerId}`);
            this.assertHasItems(data.items);
            const order = await this.ordersRepository.createForCustomer(
                customerId,
                data,
            );
            this.logger.log(
                `Order ${order.id} created for customer ${customerId}`,
            );
            return order;
        } catch (error) {
            this.handleError(error);
        }
    }

    async createForGuest(data: CreateGuestOrderInput): Promise<Order> {
        try {
            this.logger.log(`Creating guest order for ${data.guest_email}`);
            this.assertHasItems(data.items);
            const order = await this.ordersRepository.createForGuest(data);
            this.logger.log(`Guest order ${order.id} created`);
            return order;
        } catch (error) {
            this.handleError(error);
        }
    }

    async createOrder(
        data: CreateOrderBase,
        options?: {
            status?: OrderStatus;
            tx?: Prisma.TransactionClient;
        },
    ): Promise<Order> {
        try {
            this.logger.log(
                data.customer_id
                    ? `Creating order for customer ${data.customer_id}`
                    : `Creating guest order for ${data.guest_email}`,
            );
            this.assertHasItems(data.items);
            const order = await this.ordersRepository.createOrder(
                data,
                options,
            );
            this.logger.log(`Order ${order.id} created`);
            return order;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByIdempotencyKey(
        idempotencyKey: string,
    ): Promise<Order | null> {
        try {
            return await this.ordersRepository.findByIdempotencyKey(
                idempotencyKey,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async findForCustomer(
        customerId: string,
        query: FindOrdersDto,
    ): Promise<OrderSummaryPage> {
        try {
            this.logger.log(`Fetching orders for customer ${customerId}`);
            const page = await this.ordersRepository.findForCustomer(
                customerId,
                query,
            );
            this.logger.log(`Fetched orders for customer ${customerId}`);
            return page;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findForStaff(
        query: FindStaffOrdersDto,
        staffMarketIds: string[],
    ): Promise<OrderSummaryPage> {
        try {
            this.logger.log(
                `Fetching staff orders for market ${query.market_id}`,
            );
            assertActorBelongsToMarkets(staffMarketIds, [query.market_id]);
            const page = await this.ordersRepository.findForStaff(query);
            this.logger.log(
                `Fetched staff orders for market ${query.market_id}`,
            );
            return page;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOneForCustomer(
        customerId: string,
        orderId: string,
    ): Promise<CustomerOrderDetail> {
        try {
            this.logger.log(
                `Fetching order ${orderId} for customer ${customerId}`,
            );
            const order = await this.ordersRepository.findOneForCustomer(
                customerId,
                orderId,
            );
            if (!order) {
                throw new NotFoundException('Order not found');
            }
            this.logger.log(
                `Fetched order ${orderId} for customer ${customerId}`,
            );
            return toCustomerOrderDetail(order);
        } catch (error) {
            this.handleError(error);
        }
    }

    async hasCompletedPurchase(
        customerId: string,
        marketVariantId: string,
    ): Promise<boolean> {
        try {
            return await this.ordersRepository.hasCompletedPurchase(
                customerId,
                marketVariantId,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOneForStaff(
        orderId: string,
        marketId: string,
        staffMarketIds: string[],
    ): Promise<StaffOrderDetail> {
        try {
            this.logger.log(
                `Fetching staff order ${orderId} for market ${marketId}`,
            );
            assertActorBelongsToMarkets(staffMarketIds, [marketId]);
            const order = await this.ordersRepository.findOneForStaff(
                orderId,
                marketId,
            );
            if (!order) {
                throw new NotFoundException('Order not found');
            }
            this.logger.log(
                `Fetched staff order ${orderId} for market ${marketId}`,
            );
            return toStaffOrderDetail(order);
        } catch (error) {
            this.handleError(error);
        }
    }

    async cancelForCustomer(
        customerId: string,
        orderId: string,
        customer: { id: string; name: string },
    ): Promise<TransitionedOrder> {
        try {
            this.logger.log(
                `Cancelling order ${orderId} for customer ${customerId}`,
            );
            const order = await this.ordersRepository.findOneForCustomer(
                customerId,
                orderId,
            );
            if (!order) {
                throw new NotFoundException('Order not found');
            }

            if (
                order.status !== OrderStatus.PENDING &&
                order.status !== OrderStatus.PROCESSING
            ) {
                throw new BadRequestException(
                    `${order.status} orders are not eligible for cancellation`,
                );
            }

            const transition = await this.ordersRepository.transitionStatus({
                order_id: orderId,
                customer_id: customerId,
                from_statuses: [
                    OrderStatus.PENDING,
                    OrderStatus.PROCESSING,
                ],
                to_status: OrderStatus.CANCELLED,
            });

            if (!transition.ok) {
                if (transition.reason === 'not_found') {
                    throw new NotFoundException('Order not found');
                }
                throw new BadRequestException(
                    `${transition.current_status} orders are not eligible for cancellation`,
                );
            }

            await this.generalQueueService.enqueue(
                GENERAL_JOBS.CANCEL_ORDER,
                {
                    order_id: orderId,
                    actor: {
                        type: 'customer',
                        id: customer.id,
                        name: customer.name,
                        source: 'customer_cancel',
                    },
                },
                { jobId: `cancel-order-${orderId}` },
            );

            return transition.order;
        } catch (error) {
            this.handleError(error);
        }
    }

    private assertHasItems(items: { length: number }): void {
        if (items.length === 0) {
            throw new BadRequestException(
                'Order must include at least one item',
            );
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            throw error;
        }

        if (
            error instanceof Error &&
            error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS
        ) {
            throw new ForbiddenException(
                'Cannot operate on markets outside your assigned markets',
            );
        }


        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                const target = Array.isArray(error.meta?.target)
                    ? error.meta.target.join(',')
                    : String(error.meta?.target ?? '');
                if (target.includes('idempotency_key')) {
                    throw new ConflictException({
                        code: IDEMPOTENCY_KEY_CONFLICT,
                        message: IDEMPOTENCY_KEY_CONFLICT_MESSAGE,
                    });
                }
            }

            if (error.code === 'P2025') {
                const model = prismaMissingRecordModel(error);
                if (model === 'customer') {
                    throw new NotFoundException('Customer not found');
                }
                if (model === 'marketvariant') {
                    throw new NotFoundException('Market variant not found');
                }
                if (model === 'promotionusage') {
                    throw new NotFoundException('Promotion usage not found');
                }
                if (model === 'couponusage') {
                    throw new NotFoundException('Coupon usage not found');
                }
                throw new NotFoundException('Record not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'customer')
            ) {
                throw new NotFoundException('Customer not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'market_id')
            ) {
                throw new NotFoundException('Market not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'warehouse_id')
            ) {
                throw new NotFoundException('Warehouse not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'market_variant', 'marketvariant')
            ) {
                throw new NotFoundException('Market variant not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(
                    error,
                    'promotion_usage',
                    'promotionusage',
                )
            ) {
                throw new NotFoundException('Promotion usage not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'coupon_usage', 'couponusage')
            ) {
                throw new NotFoundException('Coupon usage not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
