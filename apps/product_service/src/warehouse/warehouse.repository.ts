import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Prisma,
    WarehouseStatus,
    type Warehouse,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindWarehousesDto } from './dto/find-warehouses.dto.js';
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';

export type CreateWarehouseRecord = {
    market_id: string;
    name: string;
    manager_id: string;
    address: string;
};

@Injectable()
export class WarehouseRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateWarehouseRecord): Promise<Warehouse> {
        return await this.prisma.warehouse.create({
            data: {
                market_id: data.market_id,
                name: data.name,
                manager_id: data.manager_id,
                address: data.address,
            },
        });
    }

    async findAll(query: FindWarehousesDto) {
        const limit = query.limit ?? 50;
        const where: Prisma.WarehouseWhereInput = {
            ...(query.market_id !== undefined && {
                market_id: query.market_id,
            }),
            ...(query.manager_id !== undefined && {
                manager_id: query.manager_id,
            }),
            ...(query.status !== undefined && { status: query.status }),
            ...(query.name !== undefined && {
                name: {
                    contains: query.name,
                    mode: 'insensitive',
                },
            }),
        };

        const records = await this.prisma.warehouse.findMany({
            where,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const items = hasMore ? records.slice(0, limit) : records;

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findById(id: string): Promise<Warehouse | null> {
        return await this.prisma.warehouse.findUnique({
            where: { id },
        });
    }

    async findByIdOrThrow(id: string): Promise<Warehouse> {
        const warehouse = await this.findById(id);
        if (!warehouse) {
            throw new NotFoundException('Warehouse not found');
        }
        return warehouse;
    }

    async update(id: string, data: UpdateWarehouseDto): Promise<Warehouse> {
        return await this.prisma.warehouse.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.address !== undefined && { address: data.address }),
            },
        });
    }

    async updateManager(id: string, managerId: string): Promise<Warehouse> {
        return await this.prisma.warehouse.update({
            where: { id },
            data: { manager_id: managerId },
        });
    }

    async close(id: string): Promise<Warehouse> {
        return await this.prisma.warehouse.update({
            where: { id },
            data: { status: WarehouseStatus.CLOSED },
        });
    }
}
