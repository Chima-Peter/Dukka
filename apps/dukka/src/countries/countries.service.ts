import {
    BadRequestException,
    ConflictException,
    forwardRef,
    HttpException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { CountryStatus } from '../../generated/prisma/client.js';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    isNestedConnectFailure,
    prismaHintIncludes,
} from '../shared/prisma-relation-error.js';
import { CountriesRepository } from './countries.repository.js';
import type { AssignCountryMarketDto } from './dto/assign-country-market.dto.js';
import type { CreateCountryDto } from './dto/create-country.dto.js';
import type { UpdateCountryDto } from './dto/update-country.dto.js';
import type {
    CountryWithMarket,
    CountryWithMarketStatus,
} from './types/country.type.js';

@Injectable()
export class CountriesService {
    private readonly logger = new Logger(CountriesService.name);

    constructor(
        private readonly countriesRepository: CountriesRepository,
        @Inject(forwardRef(() => MarketsService))
        private readonly marketsService: MarketsService,
    ) {}

    async create(data: CreateCountryDto): Promise<CountryWithMarket> {
        try {
            this.logger.log(`Creating country ${data.code}`);
            const country = await this.countriesRepository.create(data);
            this.logger.log(`Country created ${country.id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(): Promise<CountryWithMarket[]> {
        try {
            this.logger.log('Fetching countries');
            return await this.countriesRepository.findAll();
        } catch (error) {
            this.handleError(error);
        }
    }

    async findWithMarketStatus(
        id: string,
    ): Promise<CountryWithMarketStatus | null> {
        try {
            return await this.countriesRepository.findWithMarketStatus(id);
        } catch (error) {
            this.handleError(error);
        }
    }

    async countByMarketId(marketId: string): Promise<number> {
        try {
            return await this.countriesRepository.countByMarketId(marketId);
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateCountryDto,
    ): Promise<CountryWithMarket> {
        try {
            this.logger.log(`Updating country ${id}`);
            await this.requireCountry(id);
            const country = await this.countriesRepository.update(id, data);
            this.logger.log(`Country updated ${id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    async approve(id: string): Promise<CountryWithMarket> {
        return this.transitionStatus(
            id,
            CountryStatus.APPROVED,
            [CountryStatus.PENDING_REVIEW],
            'Only countries pending review can be approved',
            'Approving',
            'approved',
        );
    }

    async reject(id: string): Promise<CountryWithMarket> {
        return this.transitionStatus(
            id,
            CountryStatus.REJECTED,
            [CountryStatus.PENDING_REVIEW],
            'Only countries pending review can be rejected',
            'Rejecting',
            'rejected',
        );
    }

    async assignMarket(
        id: string,
        data: AssignCountryMarketDto,
        staffMarketIds: string[],
    ): Promise<CountryWithMarket> {
        try {
            this.logger.log(
                `Assigning country ${id} to market ${data.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);

            const country = await this.requireCountry(id);
            if (country.status !== CountryStatus.APPROVED) {
                throw new BadRequestException(
                    'Only approved countries can be assigned to a market',
                );
            }
            if (country.market_id) {
                throw new ConflictException(
                    'Country is already assigned to a market',
                );
            }

            const validation = await this.marketsService.validateIds({
                market_ids: [data.market_id],
            });
            if (validation.invalid_ids.length > 0) {
                throw new NotFoundException('Market not found');
            }
            if (validation.inactive_ids.length > 0) {
                throw new BadRequestException('Market is inactive');
            }

            const updated = await this.countriesRepository.assignMarket(
                id,
                data.market_id,
            );
            this.logger.log(
                `Country ${id} assigned to market ${data.market_id}`,
            );
            return updated;
        } catch (error) {
            this.handleError(error);
        }
    }

    async removeMarket(
        id: string,
        marketId: string,
        staffMarketIds: string[],
    ): Promise<CountryWithMarket> {
        try {
            this.logger.log(
                `Removing country ${id} from market ${marketId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [marketId]);

            const country = await this.requireCountry(id);
            if (!country.market_id) {
                throw new BadRequestException(
                    'Country is not assigned to a market',
                );
            }
            if (country.market_id !== marketId) {
                throw new NotFoundException(
                    'Country is not assigned to this market',
                );
            }

            const updated = await this.countriesRepository.removeMarket(id);
            this.logger.log(`Country ${id} removed from market ${marketId}`);
            return updated;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting country ${id}`);
            const country = await this.requireCountry(id);
            if (country.market_id) {
                throw new ConflictException(
                    'Country cannot be deleted while it is still assigned to a market',
                );
            }
            const serviceStateCount =
                await this.countriesRepository.countServiceStates(id);
            if (serviceStateCount > 0) {
                throw new ConflictException(
                    'Country cannot be deleted while it still has service states',
                );
            }
            const warehouseCount =
                await this.countriesRepository.countWarehouses(id);
            if (warehouseCount > 0) {
                throw new ConflictException(
                    'Country cannot be deleted while it still has warehouses',
                );
            }
            await this.countriesRepository.delete(id);
            this.logger.log(`Country deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async transitionStatus(
        id: string,
        nextStatus: CountryStatus,
        allowedFrom: CountryStatus[],
        invalidMessage: string,
        actionLog: string,
        doneLog: string,
    ): Promise<CountryWithMarket> {
        try {
            this.logger.log(`${actionLog} country ${id}`);
            const existing = await this.requireCountry(id);
            if (!allowedFrom.includes(existing.status)) {
                throw new BadRequestException(invalidMessage);
            }
            const country = await this.countriesRepository.updateStatus(
                id,
                nextStatus,
            );
            this.logger.log(`Country ${doneLog} ${id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async requireCountry(id: string): Promise<CountryWithMarket> {
        const country = await this.countriesRepository.findById(id);
        if (!country) {
            throw new NotFoundException('Country not found');
        }
        return country;
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
                    'A country with this code already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on country: ${error.message}`,
                );
                if (
                    prismaHintIncludes(error, 'market') ||
                    isNestedConnectFailure(error)
                ) {
                    throw new NotFoundException('Market not found');
                }
                if (prismaHintIncludes(error, 'service_state', 'servicestate')) {
                    throw new ConflictException(
                        'Country cannot be deleted while it still has service states',
                    );
                }
                if (prismaHintIncludes(error, 'warehouse')) {
                    throw new ConflictException(
                        'Country cannot be deleted while it still has warehouses',
                    );
                }
                throw new ConflictException(
                    'Country cannot be deleted while it is still assigned to a market',
                );
            }
            if (error.code === 'P2025') {
                if (
                    prismaHintIncludes(error, 'market') ||
                    isNestedConnectFailure(error)
                ) {
                    throw new NotFoundException('Market not found');
                }
                throw new NotFoundException('Country not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
