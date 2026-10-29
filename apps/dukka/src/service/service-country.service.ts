import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { RestCountriesIpService, ServiceCountryStatus } from '@app/common';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    isNestedConnectFailure,
    prismaHintIncludes,
} from '../shared/prisma-relation-error.js';
import { ServiceCountryRepository } from './service-country.repository.js';
import type { AssignServiceCountryMarketDto } from './dto/assign-service-country-market.dto.js';
import type { CreateServiceCountryDto } from './dto/create-service-country.dto.js';
import type { UpdateServiceCountryDto } from './dto/update-service-country.dto.js';
import type {
    ServiceCountryMarketMatch,
    ServiceCountryWithMarket,
    ServiceCountryWithMarketStatus,
} from './types/service-country.type.js';

@Injectable()
export class ServiceCountryService {
    private readonly logger = new Logger(ServiceCountryService.name);

    constructor(
        private readonly serviceCountryRepository: ServiceCountryRepository,
        private readonly marketsService: MarketsService,
        private readonly restCountriesIpService: RestCountriesIpService,
    ) {}

    async create(data: CreateServiceCountryDto): Promise<ServiceCountryWithMarket> {
        try {
            this.logger.log(`Creating service country ${data.iso2}`);
            const country = await this.serviceCountryRepository.create(data);
            this.logger.log(`Service country created ${country.id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByIDOrThrow(id: string): Promise<ServiceCountryWithMarket> {
        const country = await this.serviceCountryRepository.findById(id);
        if (!country) {
            throw new NotFoundException('Service country not found!');
        }

        return country;
     }

    async findAll(): Promise<ServiceCountryWithMarket[]> {
        try {
            this.logger.log(`Fetching open service countries`);
            const countries = await this.serviceCountryRepository.findAll();
            this.logger.log(`Fetched open service countries`);
            return countries;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAllForStaff(
        status?: ServiceCountryStatus,
    ): Promise<ServiceCountryWithMarket[]> {
        try {
            this.logger.log('Fetching staff service countries');
            const countries =
                await this.serviceCountryRepository.findAllForStaff(status);
            this.logger.log('Fetched staff service countries');
            return countries;
        } catch (error) {
            this.handleError(error);
        }
    }

    async search(iso2: string): Promise<ServiceCountryMarketMatch | null> {
        try {
            this.logger.log(`Searching service country by iso2: ${iso2}`);
            return await this.serviceCountryRepository.searchByIso2(iso2);
        } catch (error) {
            this.handleError(error);
        }
    }

    async searchByIp(
        clientIp?: string,
    ): Promise<ServiceCountryMarketMatch | null> {
        if (!clientIp) {
            this.logger.warn(
                'No client IP available; skipping service country search',
            );
            return null;
        }

        this.logger.log(`Searching service country by IP: ${clientIp}`);

        const iso2 = await this.restCountriesIpService.resolveIso2(clientIp);
        if (!iso2) {
            return null;
        }

        const match = await this.search(iso2);
        if (!match) {
            this.logger.warn(
                `No open service country found for iso2 ${iso2}`,
            );
            return null;
        }

        this.logger.log(
            `Resolved service country ${match.iso2} from IP ${clientIp}`,
        );
        return match;
    }

    async findWithMarketStatus(
        id: string,
    ): Promise<ServiceCountryWithMarketStatus | null> {
        try {
            return await this.serviceCountryRepository.findWithMarketStatus(id);
        } catch (error) {
            this.handleError(error);
        }
    }

    async countByMarketId(marketId: string): Promise<number> {
        try {
            return await this.serviceCountryRepository.countByMarketId(marketId);
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateServiceCountryDto,
    ): Promise<ServiceCountryWithMarket> {
        try {
            this.logger.log(`Updating service country ${id}`);
            const existing = await this.requireServiceCountry(id);
            if (existing.status === ServiceCountryStatus.CLOSED) {
                throw new BadRequestException('Cannot update a closed service country');
            }
            const country = await this.serviceCountryRepository.update(id, data);
            this.logger.log(`Service country updated ${id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(id: string): Promise<ServiceCountryWithMarket> {
        try {
            this.logger.log(`Opening service country ${id}`);
            const existing = await this.requireServiceCountry(id);
            if (existing.status === ServiceCountryStatus.OPEN) {
                throw new BadRequestException('Service country is already open');
            }
            const country = await this.serviceCountryRepository.updateStatus(
                id,
                ServiceCountryStatus.OPEN,
            );
            this.logger.log(`Service country opened ${id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(id: string): Promise<ServiceCountryWithMarket> {
        try {
            this.logger.log(`Closing service country ${id}`);
            const existing = await this.requireServiceCountry(id);
            if (existing.status === ServiceCountryStatus.CLOSED) {
                throw new BadRequestException('Service country is already closed');
            }
            const country = await this.serviceCountryRepository.updateStatus(
                id,
                ServiceCountryStatus.CLOSED,
            );
            this.logger.log(`Service country closed ${id}`);
            return country;
        } catch (error) {
            this.handleError(error);
        }
    }

    async assignMarket(
        id: string,
        data: AssignServiceCountryMarketDto,
        staffMarketIds: string[],
    ): Promise<ServiceCountryWithMarket> {
        try {
            this.logger.log(
                `Assigning service country ${id} to market ${data.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);

            const country = await this.requireServiceCountry(id);
            if (country.status !== ServiceCountryStatus.OPEN) {
                throw new BadRequestException(
                    'Only open service countries can be assigned to a market',
                );
            }
            if (country.market_id) {
                throw new ConflictException(
                    'Service country is already assigned to a market',
                );
            }

            const validation = await this.marketsService.validateIds({
                market_ids: [data.market_id],
            });
            if (validation.invalid_ids.length > 0) {
                throw new NotFoundException('Market not found');
            }
            if (validation.inactive_ids.length > 0) {
                throw new BadRequestException('Market is not open');
            }

            const updated = await this.serviceCountryRepository.assignMarket(
                id,
                data.market_id,
            );
            this.logger.log(
                `Service country ${id} assigned to market ${data.market_id}`,
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
    ): Promise<ServiceCountryWithMarket> {
        try {
            this.logger.log(
                `Removing service country ${id} from market ${marketId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [marketId]);

            const country = await this.requireServiceCountry(id);
            if (!country.market_id) {
                throw new BadRequestException(
                    'Service country is not assigned to a market',
                );
            }
            if (country.market_id !== marketId) {
                throw new NotFoundException(
                    'Service country is not assigned to this market',
                );
            }

            const updated = await this.serviceCountryRepository.removeMarket(id);
            this.logger.log(`Service country ${id} removed from market ${marketId}`);
            return updated;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting service country ${id}`);
            const country = await this.requireServiceCountry(id);
            if (country.status !== ServiceCountryStatus.CLOSED) {
                throw new BadRequestException(
                    'Close the country before deleting it',
                );
            }
            if (country.market_id) {
                throw new ConflictException(
                    'Service country cannot be deleted while it is still assigned to a market',
                );
            }
            const serviceStateCount =
                await this.serviceCountryRepository.countServiceStates(id);
            if (serviceStateCount > 0) {
                throw new ConflictException(
                    'Service country cannot be deleted while it still has service states',
                );
            }
            const warehouseCount =
                await this.serviceCountryRepository.countWarehouses(id);
            if (warehouseCount > 0) {
                throw new ConflictException(
                    'Service country cannot be deleted while it still has warehouses',
                );
            }
            await this.serviceCountryRepository.delete(id);
            this.logger.log(`Service country deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async requireServiceCountry(id: string): Promise<ServiceCountryWithMarket> {
        const country = await this.serviceCountryRepository.findById(id);
        if (!country) {
            throw new NotFoundException('Service country not found');
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
                    'A service country with this iso2 or iso3 already exists',
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
                        'Service country cannot be deleted while it still has service states',
                    );
                }
                if (prismaHintIncludes(error, 'warehouse')) {
                    throw new ConflictException(
                        'Service country cannot be deleted while it still has warehouses',
                    );
                }
                throw new ConflictException(
                    'Service country cannot be deleted while it is still assigned to a market',
                );
            }
            if (error.code === 'P2025') {
                if (
                    prismaHintIncludes(error, 'market') ||
                    isNestedConnectFailure(error)
                ) {
                    throw new NotFoundException('Market not found');
                }
                throw new NotFoundException('Service country not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
