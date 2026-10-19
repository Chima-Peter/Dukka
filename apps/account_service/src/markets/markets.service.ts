import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Market } from '../../generated/prisma/client.js';
import type { CreateMarketDto } from './dto/create-market.dto.js';
import type { UpdateMarketDto } from './dto/update-market.dto.js';
import { MarketsRepository } from './markets.repository.js';

@Injectable()
export class MarketsService {
    private readonly logger = new Logger(MarketsService.name);

    constructor(private readonly marketsRepository: MarketsRepository) {}

    async create(data: CreateMarketDto): Promise<Market> {
        try {
            this.logger.log(`Creating market ${data.code}`);
            const market = await this.marketsRepository.create(data);
            this.logger.log(`Market created ${market.id}`);
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(market_ids: string[]): Promise<Market[]> {
        try {
            this.logger.log('Fetching markets');
            return await this.marketsRepository.findAll(market_ids);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string, market_ids: string[]): Promise<Market> {
        try {
            this.logger.log(`Fetching market ${id}`);
            const market = await this.marketsRepository.findById(
                id,
                market_ids,
            );
            if (!market) {
                throw new NotFoundException('Market not found');
            }
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateMarketDto): Promise<Market> {
        try {
            this.logger.log(`Updating market ${id}`);
            const market = await this.marketsRepository.update(id, data);
            this.logger.log(`Market updated ${id}`);
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting market ${id}`);
            await this.marketsRepository.delete(id);
            this.logger.log(`Market deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A market with this code already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on market delete: ${error.message}`,
                );
                throw new ConflictException(
                    'Market cannot be deleted while it is still assigned to staff',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Market not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
