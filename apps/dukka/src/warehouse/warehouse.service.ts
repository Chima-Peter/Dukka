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
    WarehouseStatus,
    type Warehouse,
} from '../../generated/prisma/client.js';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { StaffService } from '../staff/staff.service.js';
import { WAREHOUSE_MANAGER_PERMISSIONS } from './constants/warehouse.constants.js';
import type { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import type { FindWarehousesDto } from './dto/find-warehouses.dto.js';
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import type { UpdateWarehouseManagerDto } from './dto/update-warehouse-manager.dto.js';
import { WarehouseRepository } from './warehouse.repository.js';

@Injectable()
export class WarehouseService {
    private readonly logger = new Logger(WarehouseService.name);

    constructor(
        private readonly warehouseRepository: WarehouseRepository,
        private readonly marketsService: MarketsService,
        private readonly staffService: StaffService,
    ) {}

    async create(
        data: CreateWarehouseDto,
        staffMarketIds: string[],
    ): Promise<Warehouse> {
        try {
            this.logger.log(
                `Creating warehouse ${data.name} in market ${data.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            await this.assertMarketsValid([data.market_id]);
            await this.assertManagerValid(data.manager_id, data.market_id);
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

    async findOne(id: string): Promise<Warehouse> {
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
    ): Promise<Warehouse> {
        try {
            this.logger.log(`Updating warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
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
    ): Promise<Warehouse> {
        try {
            this.logger.log(`Updating manager for warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update manager of a closed warehouse',
                );
            }
            await this.assertManagerValid(data.manager_id, existing.market_id);
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

    async close(id: string, staffMarketIds: string[]): Promise<Warehouse> {
        try {
            this.logger.log(`Closing warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
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

    async open(id: string, staffMarketIds: string[]): Promise<Warehouse> {
        try {
            this.logger.log(`Opening warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
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

    private async assertMarketsValid(marketIds: string[]): Promise<void> {
        const result = await this.marketsService.validateIds({
            market_ids: marketIds,
        });
        if (!result.valid) {
            const parts: string[] = [];
            if (result.invalid_ids.length > 0) {
                parts.push(
                    `Invalid market id(s): ${result.invalid_ids.join(', ')}`,
                );
            }
            if (result.inactive_ids.length > 0) {
                parts.push(
                    `Inactive market id(s): ${result.inactive_ids.join(', ')}`,
                );
            }
            throw new BadRequestException({
                message:
                    parts.length > 0
                        ? parts.join('; ')
                        : 'One or more market ids are invalid',
                invalid_ids: result.invalid_ids,
                inactive_ids: result.inactive_ids,
            });
        }
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
            if (error.code === 'P2025') {
                throw new NotFoundException('Warehouse not found');
            }
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException('Warehouse conflict');
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on warehouse: ${error.message}`,
                );
                const field = String(error.meta?.field_name ?? '');
                if (field.includes('market')) {
                    throw new BadRequestException('Invalid market reference');
                }
                if (field.includes('manager')) {
                    throw new BadRequestException('Invalid manager reference');
                }
                throw new BadRequestException('Invalid warehouse reference');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
