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
    NotificationPublisher,
    NotificationType,
    Prisma,
} from '@app/common';
import type { CreatePointsHistoryDto } from './dto/create-points-history.dto.js';
import type { FindPointsHistoryDto } from './dto/find-points-history.dto.js';
import {
    toPointsChangeView,
    toPointsHistoryView,
    type PointsChangeView,
    type PointsHistoryPageView,
} from './mappers/points.mapper.js';
import {
    PointsRepository,
    type PointsChangeResult,
} from './points.repository.js';

@Injectable()
export class PointsService {
    private readonly logger = new Logger(PointsService.name);

    constructor(
        private readonly pointsRepository: PointsRepository,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async findHistory(
        customer_id: string,
        query: FindPointsHistoryDto,
    ): Promise<PointsHistoryPageView> {
        try {
            this.logger.log(
                `Fetching points history for customer ${customer_id}`,
            );
            const history = await this.pointsRepository.findHistory(
                customer_id,
                query,
            );
            this.logger.log(
                `Fetched points history for customer ${customer_id}`,
            );
            return {
                items: history.items.map(toPointsHistoryView),
                next_cursor: history.next_cursor,
            };
        } catch (error) {
            this.handleError(error, customer_id);
        }
    }

    async getBalance(customer_id: string): Promise<number> {
        try {
            this.logger.log(
                `Fetching points balance for customer ${customer_id}`,
            );
            const balance =
                await this.pointsRepository.findBalance(customer_id);
            this.logger.log(
                `Fetched points balance for customer ${customer_id}: ${balance}`,
            );
            return balance;
        } catch (error) {
            this.handleError(error, customer_id);
        }
    }

    async earn(
        customer_id: string,
        data: CreatePointsHistoryDto,
    ): Promise<PointsChangeView> {
        try {
            this.logger.log(
                `Earning ${data.count} points for customer ${customer_id}`,
            );

            const result = await this.pointsRepository.earn(customer_id, data);

            this.logger.log(
                `Points earned for customer ${customer_id}. New balance: ${result.points.balance}`,
            );

            await this.notificationPublisher.notifyCustomer(customer_id, {
                title: 'Points earned',
                type: NotificationType.POINTS,
                text: `You earned ${data.count} points. New balance: ${result.points.balance}.`,
            });

            return toPointsChangeView(result);
        } catch (error) {
            this.handleError(error, customer_id);
        }
    }

    async redeem(
        customer_id: string,
        data: CreatePointsHistoryDto,
        tx: Prisma.TransactionClient,
    ): Promise<PointsChangeResult>;
    async redeem(
        customer_id: string,
        data: CreatePointsHistoryDto,
    ): Promise<PointsChangeView>;
    async redeem(
        customer_id: string,
        data: CreatePointsHistoryDto,
        tx?: Prisma.TransactionClient,
    ): Promise<PointsChangeResult | PointsChangeView> {
        try {
            this.logger.log(
                `Redeeming ${data.count} points for customer ${customer_id}`,
            );

            const result = await this.pointsRepository.redeem(
                customer_id,
                data,
                tx,
            );

            this.logger.log(
                `Points redeemed for customer ${customer_id}. New balance: ${result.points.balance}`,
            );

            return tx ? result : toPointsChangeView(result);
        } catch (error) {
            this.handleError(error, customer_id);
        }
    }

    private handleError(error: unknown, customer_id: string): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }
        if (error instanceof Error && error.message === 'INSUFFICIENT_POINTS') {
            this.logger.warn(`Insufficient points for customer ${customer_id}`);
            throw new BadRequestException('Insufficient points balance');
        }
        if (
            error instanceof PrismaClientKnownRequestError &&
            (error.code === 'P2003' || error.code === 'P2025')
        ) {
            this.logger.warn(`Customer not found: ${error.message}`);
            throw new NotFoundException('Customer not found');
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
