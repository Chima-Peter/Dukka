import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { CreatePointsHistoryDto } from './dto/create-points-history.dto.js';
import type { FindPointsHistoryDto } from './dto/find-points-history.dto.js';
import {
    PointsRepository,
    type PointsChangeResult,
    type PointsHistoryPage,
} from './points.repository.js';

@Injectable()
export class PointsService {
    private readonly logger = new Logger(PointsService.name);

    constructor(private readonly pointsRepository: PointsRepository) {}

    async findHistory(
        customer_id: string,
        query: FindPointsHistoryDto,
    ): Promise<PointsHistoryPage> {
        try {
            this.logger.log(
                `Fetching points history for customer ${customer_id}`,
            );
            return await this.pointsRepository.findHistory(customer_id, query);
        } catch (error) {
            this.handleError(error, customer_id);
        }
    }

    async earn(
        customer_id: string,
        data: CreatePointsHistoryDto,
    ): Promise<PointsChangeResult> {
        try {
            this.logger.log(
                `Earning ${data.count} points for customer ${customer_id}`,
            );

            const result = await this.pointsRepository.earn(customer_id, data);

            this.logger.log(
                `Points earned for customer ${customer_id}. New balance: ${result.points.balance}`,
            );

            return result;
        } catch (error) {
            this.handleError(error, customer_id);
        }
    }

    async redeem(
        customer_id: string,
        data: CreatePointsHistoryDto,
    ): Promise<PointsChangeResult> {
        try {
            this.logger.log(
                `Redeeming ${data.count} points for customer ${customer_id}`,
            );

            const result = await this.pointsRepository.redeem(
                customer_id,
                data,
            );

            this.logger.log(
                `Points redeemed for customer ${customer_id}. New balance: ${result.points.balance}`,
            );

            return result;
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
