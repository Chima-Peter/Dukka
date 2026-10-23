import { Injectable, NotFoundException } from '@nestjs/common';
import {
    WarehouseStatus,
    type ServiceState,
    type WarehouseServiceState,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindServiceStatesDto } from './dto/find-service-states.dto.js';
import type {
    ServiceStateItem,
    WarehouseServiceStateItem,
} from './types/service-state.type.js';
import type { WarehouseRecord } from './types/warehouse.type.js';

type ServiceStateWithRelations = ServiceState & {
    country: { market_id: string | null };
    warehouse_service_states: Array<{ warehouse_id: string }>;
};

@Injectable()
export class ServiceStateRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        countryId: string,
        stateName: string,
    ): Promise<ServiceStateItem> {
        const row = await this.prisma.serviceState.create({
            data: {
                state_name: stateName,
                country: { connect: { id: countryId } },
            },
            include: {
                country: {
                    select: { market_id: true },
                },
                warehouse_service_states: {
                    select: { warehouse_id: true },
                },
            },
        });
        return this.toItem(row);
    }

    async findAll(query: FindServiceStatesDto) {
        const limit = query.limit ?? 50;
        const rows = await this.prisma.serviceState.findMany({
            where: { country_id: query.country_id },
            include: {
                country: {
                    select: { market_id: true },
                },
                warehouse_service_states: {
                    select: { warehouse_id: true },
                },
            },
            orderBy: [{ state_name: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;
        const items = page.map((row) => this.toItem(row));

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findById(id: string): Promise<ServiceStateWithRelations | null> {
        return await this.prisma.serviceState.findUnique({
            where: { id },
            include: {
                country: {
                    select: { market_id: true },
                },
                warehouse_service_states: {
                    select: { warehouse_id: true },
                },
            },
        });
    }

    async findByIdOrThrow(id: string): Promise<ServiceStateWithRelations> {
        const serviceState = await this.findById(id);
        if (!serviceState) {
            throw new NotFoundException('Service state not found');
        }
        return serviceState;
    }

    async update(
        id: string,
        countryId: string,
        stateName: string,
    ): Promise<ServiceStateItem> {
        const row = await this.prisma.serviceState.update({
            where: { id, country_id: countryId },
            data: { state_name: stateName },
            include: {
                country: {
                    select: { market_id: true },
                },
                warehouse_service_states: {
                    select: { warehouse_id: true },
                },
            },
        });
        return this.toItem(row);
    }

    async delete(id: string, countryId: string): Promise<ServiceStateItem> {
        const row = await this.prisma.serviceState.delete({
            where: { id, country_id: countryId },
            include: {
                country: {
                    select: { market_id: true },
                },
                warehouse_service_states: {
                    select: { warehouse_id: true },
                },
            },
        });
        return this.toItem(row);
    }

    async findWarehouseCoveringState(
        serviceStateId: string,
    ): Promise<WarehouseRecord | null> {
        const link = await this.prisma.warehouseServiceState.findFirst({
            where: {
                service_state_id: serviceStateId,
                warehouse: {
                    status: WarehouseStatus.OPEN,
                },
            },
            include: {
                warehouse: {
                    include: {
                        country: {
                            select: {
                                id: true,
                                market_id: true,
                            },
                        },
                    },
                },
                service_state: true,
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        });
        return link?.warehouse ?? null;
    }

    async assignWarehouse(
        serviceStateId: string,
        warehouseId: string,
    ): Promise<WarehouseServiceStateItem> {
        const row = await this.prisma.warehouseServiceState.create({
            data: {
                service_state: { connect: { id: serviceStateId } },
                warehouse: { connect: { id: warehouseId } },
            },
        });
        return this.toLinkItem(row);
    }

    async unassignWarehouse(
        serviceStateId: string,
        warehouseId: string,
    ): Promise<WarehouseServiceStateItem> {
        const row = await this.prisma.warehouseServiceState.delete({
            where: {
                warehouse_id_service_state_id: {
                    warehouse_id: warehouseId,
                    service_state_id: serviceStateId,
                },
            },
        });
        return this.toLinkItem(row);
    }

    private toItem(row: ServiceStateWithRelations): ServiceStateItem {
        return {
            id: row.id,
            country_id: row.country_id,
            market_id: row.country.market_id,
            state_name: row.state_name,
            warehouse_ids: row.warehouse_service_states.map(
                (link) => link.warehouse_id,
            ),
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private toLinkItem(row: WarehouseServiceState): WarehouseServiceStateItem {
        return {
            id: row.id,
            warehouse_id: row.warehouse_id,
            service_state_id: row.service_state_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
