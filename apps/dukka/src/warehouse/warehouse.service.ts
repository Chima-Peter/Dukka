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
    WarehouseStatus,
} from '../../generated/prisma/client.js';
import { CountriesService } from '../countries/countries.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { StaffService } from '../staff/staff.service.js';
import { WAREHOUSE_MANAGER_PERMISSIONS } from './constants/warehouse.constants.js';
import type { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import type { FindWarehousesDto } from './dto/find-warehouses.dto.js';
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import type { UpdateWarehouseManagerDto } from './dto/update-warehouse-manager.dto.js';
import type { WarehouseRecord } from './types/warehouse.type.js';
import { WarehouseRepository } from './warehouse.repository.js';

@Injectable()
export class WarehouseService {
    private readonly logger = new Logger(WarehouseService.name);

    constructor(
        private readonly warehouseRepository: WarehouseRepository,
        private readonly staffService: StaffService,
        private readonly countriesService: CountriesService,
    ) {}

    async create(
        data: CreateWarehouseDto,
        staffMarketIds: string[],
    ): Promise<WarehouseRecord> {
        try {
            this.logger.log(
                `Creating warehouse ${data.name} in country ${data.country_id}`,
            );
            const marketId = await this.requireCountryMarket(
                data.country_id,
                staffMarketIds,
            );
            await this.assertManagerValid(data.manager_id, marketId);
            const warehouse = await this.warehouseRepository.create(data);
            this.logger.log(`Warehouse created ${warehouse.id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindWarehousesDto) {
        try {
            this.logger.log('Fetching warehouses');
            const page = await this.warehouseRepository.findAll(query);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Fetching warehouse ${id}`);
            return await this.warehouseRepository.findByIdOrThrow(id);
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateWarehouseDto,
        staffMarketIds: string[],
    ): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Updating warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            this.assertWarehouseMarketAccess(existing, staffMarketIds);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update a closed warehouse',
                );
            }
            const warehouse = await this.warehouseRepository.update(id, data);
            this.logger.log(`Warehouse updated ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateManager(
        id: string,
        data: UpdateWarehouseManagerDto,
        staffMarketIds: string[],
    ): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Updating manager for warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            const marketId = this.assertWarehouseMarketAccess(
                existing,
                staffMarketIds,
            );
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update manager of a closed warehouse',
                );
            }
            await this.assertManagerValid(data.manager_id, marketId);
            const warehouse = await this.warehouseRepository.updateManager(
                id,
                data.manager_id,
            );
            this.logger.log(`Warehouse manager updated ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(id: string, staffMarketIds: string[]): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Closing warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            this.assertWarehouseMarketAccess(existing, staffMarketIds);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException('Warehouse is already closed');
            }
            const warehouse = await this.warehouseRepository.close(id);
            this.logger.log(`Warehouse closed ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(id: string, staffMarketIds: string[]): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Opening warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            this.assertWarehouseMarketAccess(existing, staffMarketIds);
            if (existing.status === WarehouseStatus.OPEN) {
                throw new BadRequestException('Warehouse is already open');
            }
            const warehouse = await this.warehouseRepository.open(id);
            this.logger.log(`Warehouse opened ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    private assertWarehouseMarketAccess(
        warehouse: WarehouseRecord,
        staffMarketIds: string[],
    ): string {
        const marketId = warehouse.country.market_id;
        if (!marketId) {
            throw new BadRequestException(
                'Warehouse country is not assigned to a market',
            );
        }
        assertStaffHasMarkets(staffMarketIds, [marketId]);
        return marketId;
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
                'Only open countries can have warehouses',
            );
        }
        if (!country.market_id || !country.market) {
            throw new BadRequestException(
                'Country must be assigned to a market before managing warehouses',
            );
        }
        if (country.market.status !== MarketStatus.OPEN) {
            throw new BadRequestException('Market is not open');
        }
        assertStaffHasMarkets(staffMarketIds, [country.market_id]);
        return country.market_id;
    }

    private async assertManagerValid(
        managerId: string,
        marketId: string,
    ): Promise<void> {
        const result = await this.staffService.validateIds({
            staff_ids: [managerId],
            permissions: [...WAREHOUSE_MANAGER_PERMISSIONS],
            market_id: marketId,
        });
        if (!result.valid) {
            const parts: string[] = [];
            if (result.invalid_ids.length > 0) {
                parts.push('Manager is not a valid staff member');
            }
            if (result.inactive_ids.length > 0) {
                parts.push('Manager staff account is inactive');
            }
            if (result.missing_permission_ids.length > 0) {
                parts.push('Manager lacks required warehouse permissions');
            }
            if (result.missing_market_ids.length > 0) {
                parts.push(
                    'Manager is not assigned to the warehouse market',
                );
            }
            throw new BadRequestException({
                message:
                    parts.length > 0
                        ? parts.join('; ')
                        : 'Manager is invalid',
                invalid_ids: result.invalid_ids,
                inactive_ids: result.inactive_ids,
                missing_permission_ids: result.missing_permission_ids,
                missing_market_ids: result.missing_market_ids,
            });
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
                throw new ConflictException('Warehouse conflict');
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Warehouse relation error ${error.code}: ${error.message}`,
                );
                throw this.warehouseRelationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private warehouseRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'country':
                return new NotFoundException('Country not found');
            case 'staff':
                return new NotFoundException('Manager not found');
            case 'warehouse':
                return new NotFoundException('Warehouse not found');
            default:
                break;
        }

        if (prismaHintIncludes(error, 'country_id', "'country'")) {
            return new NotFoundException('Country not found');
        }
        if (prismaHintIncludes(error, 'manager', 'staff')) {
            return new NotFoundException('Manager not found');
        }
        return new NotFoundException('Warehouse not found');
    }
}
