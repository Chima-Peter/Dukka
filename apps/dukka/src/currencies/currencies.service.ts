import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Currency } from '@app/common';
import { CurrenciesRepository } from './currencies.repository.js';
import type { CreateCurrencyDto } from './dto/create-currency.dto.js';
import type { UpdateCurrencyDto } from './dto/update-currency.dto.js';

@Injectable()
export class CurrenciesService {
    private readonly logger = new Logger(CurrenciesService.name);

    constructor(
        private readonly currenciesRepository: CurrenciesRepository,
    ) {}

    async create(data: CreateCurrencyDto): Promise<Currency> {
        try {
            this.logger.log(`Creating currency ${data.code}`);
            const currency = await this.currenciesRepository.create(data);
            this.logger.log(`Currency created ${currency.id}`);
            return currency;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(): Promise<Currency[]> {
        try {
            this.logger.log('Fetching currencies');
            return await this.currenciesRepository.findAll();
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<Currency> {
        try {
            this.logger.log(`Fetching currency ${id}`);
            const currency = await this.currenciesRepository.findById(id);
            if (!currency) {
                throw new NotFoundException('Currency not found');
            }
            return currency;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateCurrencyDto): Promise<Currency> {
        try {
            this.logger.log(`Updating currency ${id}`);
            const currency = await this.currenciesRepository.update(id, data);
            this.logger.log(`Currency updated ${id}`);
            return currency;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting currency ${id}`);
            await this.currenciesRepository.delete(id);
            this.logger.log(`Currency deleted ${id}`);
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
                    'A currency with this code already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on currency delete: ${error.message}`,
                );
                throw new ConflictException(
                    'Currency cannot be deleted while it is still assigned to markets',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Currency not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
