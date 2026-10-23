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
import {
    CountryStatus,
    MarketStatus,
    ServiceStateStatus,
    WarehouseStatus,
} from '../../generated/prisma/client.js';
import { CountriesService } from '../countries/countries.service.js';
import { CustomerService } from '../customer/customer.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { resolveMarketId } from '../shared/resolve-market-id.js';
import type { AssignWarehouseServiceStateDto } from './dto/assign-warehouse-service-state.dto.js';
import type { CreateServiceStateDto } from './dto/create-service-state.dto.js';
import type { FindServiceStatesDto } from './dto/find-service-states.dto.js';
import type { FindStaffServiceStatesDto } from './dto/find-staff-service-states.dto.js';
import type { UpdateServiceStateDto } from './dto/update-service-state.dto.js';
import { ServiceStateRepository } from './service-state.repository.js';
import type {
    ServiceStateItem,
    WarehouseServiceStateItem,
} from './types/service-state.type.js';
import type { WarehouseRecord } from './types/warehouse.type.js';
import { WarehouseRepository } from './warehouse.repository.js';

@Injectable()
export class ServiceStateService {
    private readonly logger = new Logger(ServiceStateService.name);

    constructor(
        private readonly serviceStateRepository: ServiceStateRepository,
        private readonly warehouseRepository: WarehouseRepository,
        private readonly countriesService: CountriesService,
        private readonly customerService: CustomerService,
    ) {}

    async create(
        data: CreateServiceStateDto,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(
                `Creating service state ${data.state_name} in country ${data.country_id}`,
            );
            const marketId = await this.requireCountryMarket(
                data.country_id,
                staffMarketIds,
            );
            const serviceState = await this.serviceStateRepository.create(
                data.country_id,
                data.state_name,
            );
            this.logger.log(
                `Service state created ${serviceState.id} (market ${marketId})`,
            );
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(
        customerId: string | undefined,
        query: FindServiceStatesDto,
    ) {
        try {
            const marketId =
                query.country_id === undefined
                    ? await resolveMarketId(
                          this.customerService,
                          customerId,
                          query.market_id,
                      )
                    : query.market_id;

            this.logger.log(
                marketId !== undefined
                    ? `Fetching open service states for market ${marketId}`
                    : `Fetching open service states for country ${query.country_id}`,
            );
            const page = await this.serviceStateRepository.findAll({
                ...query,
                ...(marketId !== undefined && { market_id: marketId }),
            });
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAllForStaff(query: FindStaffServiceStatesDto) {
        try {
            this.logger.log(
                `Fetching staff service states for country ${query.country_id}`,
            );
            const page =
                await this.serviceStateRepository.findAllForStaff(query);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findWarehouseCoveringState(
        serviceStateId: string,
    ): Promise<WarehouseRecord> {
        try {
            this.logger.log(
                `Fetching warehouse covering service state ${serviceStateId}`,
            );
            const warehouse =
                await this.serviceStateRepository.findWarehouseCoveringState(
                    serviceStateId,
                );
            if (!warehouse) {
                throw new NotFoundException(
                    'No open warehouse covers this state',
                );
            }
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateServiceStateDto,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(`Updating service state ${id}`);
            await this.requireCountryMarket(data.country_id, staffMarketIds);
            const existing =
                await this.serviceStateRepository.findByIdOrThrow(id);
            if (existing.status === ServiceStateStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update a closed service state',
                );
            }
            const serviceState = await this.serviceStateRepository.update(
                id,
                data.country_id,
                data.state_name,
            );
            this.logger.log(`Service state updated ${id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(
        id: string,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(`Opening service state ${id}`);
            const existing =
                await this.serviceStateRepository.findByIdOrThrow(id);
            await this.requireCountryMarket(
                existing.country_id,
                staffMarketIds,
            );
            if (existing.status === ServiceStateStatus.OPEN) {
                throw new BadRequestException(
                    'Service state is already open',
                );
            }
            const serviceState = await this.serviceStateRepository.setStatus(
                id,
                ServiceStateStatus.OPEN,
            );
            this.logger.log(`Service state opened ${id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(
        id: string,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(`Closing service state ${id}`);
            const existing =
                await this.serviceStateRepository.findByIdOrThrow(id);
            await this.requireCountryMarket(
                existing.country_id,
                staffMarketIds,
            );
            if (existing.status === ServiceStateStatus.CLOSED) {
                throw new BadRequestException(
                    'Service state is already closed',
                );
            }
            const serviceState = await this.serviceStateRepository.setStatus(
                id,
                ServiceStateStatus.CLOSED,
            );
            this.logger.log(`Service state closed ${id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(
        id: string,
        countryId: string,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(`Deleting service state ${id}`);
            await this.requireCountryMarket(countryId, staffMarketIds);
            const existing =
                await this.serviceStateRepository.findByIdOrThrow(id);
            if (existing.status !== ServiceStateStatus.CLOSED) {
                throw new BadRequestException(
                    'Close the service state before deleting it',
                );
            }
            const serviceState = await this.serviceStateRepository.delete(
                id,
                countryId,
            );
            this.logger.log(`Service state deleted ${id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async assignWarehouse(
        id: string,
        data: AssignWarehouseServiceStateDto,
        staffMarketIds: string[],
    ): Promise<WarehouseServiceStateItem> {
        try {
            this.logger.log(
                `Assigning warehouse ${data.warehouse_id} to service state ${id}`,
            );
            const serviceState =
                await this.serviceStateRepository.findByIdOrThrow(id);
            if (serviceState.status === ServiceStateStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot assign a warehouse to a closed service state',
                );
            }
            const marketId = serviceState.country.market_id;
            if (!marketId) {
                throw new BadRequestException(
                    'Service state country is not assigned to a market',
                );
            }
            assertStaffHasMarkets(staffMarketIds, [marketId]);

            const warehouse = await this.warehouseRepository.findByIdOrThrow(
                data.warehouse_id,
            );
            if (warehouse.country.market_id !== marketId) {
                throw new BadRequestException(
                    'Warehouse does not belong to the same market as the service state country',
                );
            }
            if (warehouse.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot assign a closed warehouse to a service state',
                );
            }

            const link = await this.serviceStateRepository.assignWarehouse(
                id,
                data.warehouse_id,
            );
            this.logger.log(
                `Warehouse ${data.warehouse_id} assigned to service state ${id}`,
            );
            return link;
        } catch (error) {
            this.handleError(error);
        }
    }

    async unassignWarehouse(
        id: string,
        warehouseId: string,
        staffMarketIds: string[],
    ): Promise<WarehouseServiceStateItem> {
        try {
            this.logger.log(
                `Unassigning warehouse ${warehouseId} from service state ${id}`,
            );
            const serviceState =
                await this.serviceStateRepository.findByIdOrThrow(id);
            const marketId = serviceState.country.market_id;
            if (!marketId) {
                throw new BadRequestException(
                    'Service state country is not assigned to a market',
                );
            }
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            const link = await this.serviceStateRepository.unassignWarehouse(
                id,
                warehouseId,
            );
            this.logger.log(
                `Warehouse ${warehouseId} unassigned from service state ${id}`,
            );
            return link;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async requireCountryMarket(
        countryId: string,
        staffMarketIds: string[],
    ): Promise<string> {
        const country =
            await this.countriesService.findWithMarketStatus(countryId);
        if (!country) {
            throw new NotFoundException('Country not found');
        }
        if (country.status !== CountryStatus.OPEN) {
            throw new BadRequestException(
                'Only open countries can have service states',
            );
        }
        if (!country.market_id || !country.market) {
            throw new BadRequestException(
                'Country must be assigned to a market before managing service states',
            );
        }
        if (country.market.status !== MarketStatus.OPEN) {
            throw new BadRequestException('Market is not open');
        }
        assertStaffHasMarkets(staffMarketIds, [country.market_id]);
        return country.market_id;
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
                    'Service state already exists for this country or warehouse link already exists',
                );
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Service state relation error ${error.code}: ${error.message}`,
                );
                throw this.relationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private relationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'country':
                return new NotFoundException('Country not found');
            case 'warehouse':
                return new NotFoundException('Warehouse not found');
            case 'servicestate':
                return new NotFoundException('Service state not found');
            case 'warehouseservicestate':
                return new NotFoundException(
                    'Warehouse is not assigned to this service state',
                );
            default:
                break;
        }

        if (prismaHintIncludes(error, 'country_id', "'country'")) {
            return new NotFoundException('Country not found');
        }
        if (prismaHintIncludes(error, 'warehouse')) {
            return new NotFoundException('Warehouse not found');
        }
        if (prismaHintIncludes(error, 'service_state')) {
            return new NotFoundException('Service state not found');
        }
        return new NotFoundException('Service state not found');
    }
}
