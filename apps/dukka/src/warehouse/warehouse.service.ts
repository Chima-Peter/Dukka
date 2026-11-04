import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
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
    ScopeType,
    WarehouseStatus,
} from '@app/common';
import { MarketsService } from '../markets/markets.service.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorBelongsToMarkets,
} from '../shared/access-control.js';
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
import type {
    WarehouseAuditActor,
    WarehouseRecord,
} from './types/warehouse.type.js';
import { WarehouseRepository } from './warehouse.repository.js';

@Injectable()
export class WarehouseService {
    private readonly logger = new Logger(WarehouseService.name);

    constructor(
        private readonly warehouseRepository: WarehouseRepository,
        private readonly staffService: StaffService,
        private readonly marketsService: MarketsService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async create(
        data: CreateWarehouseDto,
        staffMarketIds: string[],
        performed_by: WarehouseAuditActor,
    ): Promise<WarehouseRecord> {
        try {
            this.logger.log(
                `Creating warehouse ${data.name} in market ${data.market_id}`,
            );
            const market = await this.marketsService.requireOpenMarket(
                data.market_id,
                staffMarketIds,
            );
            const manager = await this.assertManagerValid(data.manager_id, {
                scope_type: ScopeType.WAREHOUSE,
            });
            const warehouse = await this.warehouseRepository.create(
                data,
                performed_by,
                manager,
                { id: market.id, name: market.name },
            );
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
            this.logger.log('Fetched warehouses');
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
            const warehouse =
                await this.warehouseRepository.findByIdOrThrow(id);
            this.logger.log(`Fetched warehouse ${id}`);
            return warehouse;
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
            assertActorBelongsToMarkets(staffMarketIds, [existing.market_id]);
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
        performed_by: WarehouseAuditActor,
    ): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Updating manager for warehouse ${id}`);
            const existing =
                await this.warehouseRepository.findByIdWithAuditRelationsOrThrow(
                    id,
                );
            if (existing.manager_id === data.manager_id) {
                throw new BadRequestException(
                    'New manager is the same as the current manager',
                );
            }
            assertActorBelongsToMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update manager of a closed warehouse',
                );
            }
            const nextManager = await this.assertManagerValid(data.manager_id, {
                scope_type: ScopeType.WAREHOUSE,
            });
            const warehouse = await this.warehouseRepository.updateManager(
                id,
                data.manager_id,
                existing.manager_id,
                performed_by,
                existing.manager,
                nextManager,
                existing.market,
            );
            this.logger.log(`Warehouse manager updated ${id}`);

            await this.notificationPublisher.notifyStaff(existing.manager_id, {
                title: 'Warehouse manager changed',
                type: NotificationType.SYSTEM,
                text: `You are no longer the manager of ${warehouse.name}.`,
            });
            await this.notificationPublisher.notifyStaff(data.manager_id, {
                title: 'Warehouse assigned',
                type: NotificationType.SYSTEM,
                text: `You are now the manager of ${warehouse.name}.`,
            });

            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(id: string, staffMarketIds: string[]): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Closing warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertActorBelongsToMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException('Warehouse is already closed');
            }
            const warehouse = await this.warehouseRepository.close(id);
            this.logger.log(`Warehouse closed ${id}`);

            await this.notificationPublisher.notifyStaff(warehouse.manager_id, {
                title: 'Warehouse closed',
                type: NotificationType.SYSTEM,
                text: `${warehouse.name} has been closed.`,
            });

            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(id: string, staffMarketIds: string[]): Promise<WarehouseRecord> {
        try {
            this.logger.log(`Opening warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertActorBelongsToMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.OPEN) {
                throw new BadRequestException('Warehouse is already open');
            }
            const warehouse = await this.warehouseRepository.open(id);
            this.logger.log(`Warehouse opened ${id}`);

            await this.notificationPublisher.notifyStaff(warehouse.manager_id, {
                title: 'Warehouse opened',
                type: NotificationType.SYSTEM,
                text: `${warehouse.name} has been opened.`,
            });

            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async assertManagerValid(
        managerId: string,
        scope: {
            scope_type: typeof ScopeType.WAREHOUSE;
            warehouse_id?: string;
        },
    ): Promise<WarehouseAuditActor> {
        const result = await this.staffService.validateIds({
            staff_ids: [managerId],
            permissions: [...WAREHOUSE_MANAGER_PERMISSIONS],
            scope,
        });
        const manager = result.staff[managerId];
        if (!manager?.valid || manager.name === null) {
            const parts: string[] = [];
            if (!manager?.exists) {
                parts.push('Manager is not a valid staff member');
            }
            if (manager?.exists && !manager.is_active) {
                parts.push('Manager staff account is inactive');
            }
            if (manager?.exists && manager.is_active && !manager.has_permissions) {
                parts.push('Manager lacks required warehouse permissions');
            }
            if (manager?.exists && manager.is_active && !manager.has_scope) {
                parts.push(
                    scope.warehouse_id !== undefined
                        ? 'Manager is not scoped to this warehouse'
                        : 'Manager must have a warehouse-scoped role',
                );
            }
            throw new BadRequestException({
                message:
                    parts.length > 0
                        ? parts.join('; ')
                        : 'Manager is invalid',
                staff: result.staff,
            });
        }

        return { id: manager.id, name: manager.name };
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (
            error instanceof Error &&
            error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS
        ) {
            throw new ForbiddenException(
                'Cannot operate on markets outside your assigned markets',
            );
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
            case 'market':
                return new NotFoundException('Market not found');
            case 'staff':
                return new NotFoundException('Manager not found');
            case 'warehouse':
                return new NotFoundException('Warehouse not found');
            default:
                break;
        }

        if (prismaHintIncludes(error, 'market_id', "'market'")) {
            return new NotFoundException('Market not found');
        }
        if (prismaHintIncludes(error, 'manager', 'staff')) {
            return new NotFoundException('Manager not found');
        }
        return new NotFoundException('Warehouse not found');
    }
}
