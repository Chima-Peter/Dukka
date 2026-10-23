import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Order } from '../../generated/prisma/client.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { OrdersRepository } from './orders.repository.js';
import type {
    CreateGuestOrderInput,
    CreateOrderInput,
} from './types/create-order.type.js';

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
            const order = await this.ordersRepository.createForCustomer(
                customerId,
                data,
            );
            this.logger.log(`Order ${order.id} created for customer ${customerId}`);
            return order;
        } catch (error) {
            this.handleError(error);
        }
    }

    async createForGuest(data: CreateGuestOrderInput): Promise<Order> {
        try {
            this.logger.log(`Creating guest order for ${data.guest_email}`);
            const order = await this.ordersRepository.createForGuest(data);
            this.logger.log(`Guest order ${order.id} created`);
            return order;
        } catch (error) {
            this.handleError(error);
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
