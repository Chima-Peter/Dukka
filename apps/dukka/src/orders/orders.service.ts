import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    OrderStatus,
    type Order,
} from '@app/common';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { FindOrdersDto } from './dto/find-orders.dto.js';
import type { FindStaffOrdersDto } from './dto/find-staff-orders.dto.js';
import { OrdersRepository } from './orders.repository.js';
import type {
    CreateGuestOrderInput,
    CreateOrderInput,
} from './types/create-order.type.js';
import type {
    CustomerOrderDetail,
    OrderSummaryPage,
    StaffOrderDetail,
    TransitionedOrder,
    TransitionOrderStatusInput,
} from './types/order.type.js';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(private readonly ordersRepository: OrdersRepository) {}

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

    async findForCustomer(
        customerId: string,
        query: FindOrdersDto,
    ): Promise<OrderSummaryPage> {
        try {
            this.logger.log(`Fetching orders for customer ${customerId}`);
            return await this.ordersRepository.findForCustomer(
                customerId,
                query,
            );
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
            assertStaffHasMarkets(staffMarketIds, [query.market_id]);
            return await this.ordersRepository.findForStaff(query);
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
            return order;
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
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            const order = await this.ordersRepository.findOneForStaff(
                orderId,
                marketId,
            );
            if (!order) {
                throw new NotFoundException('Order not found');
            }
            return order;
        } catch (error) {
            this.handleError(error);
        }
    }

    async transitionStatus(
        data: TransitionOrderStatusInput,
    ): Promise<TransitionedOrder> {
        try {
            this.logger.log(
                `Transitioning order ${data.order_id} to ${data.to_status}`,
            );
            if (data.from_statuses.length === 0) {
                throw new BadRequestException(
                    'from_statuses must include at least one status',
                );
            }

            const result =
                await this.ordersRepository.transitionStatus(data);

            if (!result.ok) {
                if (result.reason === 'not_found') {
                    throw new NotFoundException('Order not found');
                }
                throw new BadRequestException(
                    `Cannot transition order from ${result.current_status} to ${data.to_status}`,
                );
            }

            this.logger.log(
                `Order ${result.order.id} transitioned to ${result.order.status}`,
            );
            return result.order;
        } catch (error) {
            this.handleError(error);
        }
    }

    async cancelForCustomer(
        customerId: string,
        orderId: string,
    ): Promise<TransitionedOrder> {
        try {
            this.logger.log(
                `Cancelling order ${orderId} for customer ${customerId}`,
            );
            return await this.transitionStatus({
                order_id: orderId,
                customer_id: customerId,
                from_statuses: [OrderStatus.PENDING, OrderStatus.PROCESSING],
                to_status: OrderStatus.CANCELLED,
            });
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

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                const model = prismaMissingRecordModel(error);
                if (model === 'customer') {
                    throw new NotFoundException('Customer not found');
                }
                if (model === 'marketvariant') {
                    throw new NotFoundException('Market variant not found');
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
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
