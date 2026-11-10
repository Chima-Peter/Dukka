import { Injectable, NotFoundException } from '@nestjs/common';
import {
    LogisticsLocationType,
    Prisma,
    ScopeType,
    StaffAuditAction,
    WarehouseStatus,
    PrismaService,
} from '@app/common';
import type { FindWarehousesDto } from './dto/find-warehouses.dto.js';
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import {
    warehouseStaffSelect,
    type CreateWarehouseRecord,
    type WarehouseAuditActor,
    type WarehouseRecord,
    type WarehouseStaffMember,
    type WarehouseWithAuditRelations,
} from './types/warehouse.type.js';

@Injectable()
export class WarehouseRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: CreateWarehouseRecord,
        performed_by: WarehouseAuditActor,
        manager: WarehouseAuditActor,
        market: WarehouseAuditActor,
    ): Promise<WarehouseRecord> {
        return await this.prisma.$transaction(async (tx) => {
            const warehouse = await tx.warehouse.create({
                data: {
                    name: data.name,
                    address: data.address,
                    market: { connect: { id: data.market_id } },
                    manager: { connect: { id: data.manager_id } },
                    logistics_location: {
                        create: {
                            type: LogisticsLocationType.WAREHOUSE,
                            name: data.name,
                            address: data.address,
                            country: data.country,
                        },
                    },
                },
            });

            await tx.staffScope.create({
                data: {
                    scope_type: ScopeType.WAREHOUSE,
                    staff: { connect: { id: data.manager_id } },
                    warehouse: { connect: { id: warehouse.id } },
                },
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.SCOPE_ASSIGNED,
                    staff_id: manager.id,
                    staff_name: manager.name,
                    performed_by_staff_id: performed_by.id,
                    performed_by_staff_name: performed_by.name,
                    market_id: market.id,
                    market_name: market.name,
                },
            });

            return warehouse;
        });
    }

    async findAll(
        query: FindWarehousesDto,
        scope?: { market_ids?: string[]; warehouse_ids?: string[] },
    ) {
        const limit = query.limit ?? 50;
        const where: Prisma.WarehouseWhereInput = {
            ...(query.market_id !== undefined && {
                market_id: query.market_id,
            }),
            ...(query.market_id === undefined &&
                scope?.market_ids !== undefined && {
                    market_id: { in: scope.market_ids },
                }),
            ...(scope?.warehouse_ids !== undefined && {
                id: { in: scope.warehouse_ids },
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

    async findById(id: string): Promise<WarehouseRecord | null> {
        return await this.prisma.warehouse.findUnique({
            where: { id },
        });
    }

    async findByIdOrThrow(id: string): Promise<WarehouseRecord> {
        const warehouse = await this.findById(id);
        if (!warehouse) {
            throw new NotFoundException('Warehouse not found');
        }
        return warehouse;
    }

    async findByIdWithAuditRelationsOrThrow(
        id: string,
    ): Promise<WarehouseWithAuditRelations> {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id },
            include: {
                market: { select: { id: true, name: true } },
                manager: { select: { id: true, name: true } },
            },
        });
        if (!warehouse) {
            throw new NotFoundException('Warehouse not found');
        }
        return warehouse;
    }

    async update(id: string, data: UpdateWarehouseDto): Promise<WarehouseRecord> {
        return await this.prisma.warehouse.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.address !== undefined && { address: data.address }),
            },
        });
    }

    async updateManager(
        id: string,
        managerId: string,
        previousManagerId: string,
        performed_by: WarehouseAuditActor,
        previousManager: WarehouseAuditActor,
        nextManager: WarehouseAuditActor,
        market: WarehouseAuditActor,
    ): Promise<WarehouseRecord> {
        return await this.prisma.$transaction(async (tx) => {
            const warehouse = await tx.warehouse.update({
                where: { id },
                data: {
                    manager: { connect: { id: managerId } },
                },
            });

            await tx.staffScope.deleteMany({
                where: {
                    staff_id: previousManagerId,
                    warehouse_id: id,
                    scope_type: ScopeType.WAREHOUSE,
                },
            });

            await tx.staffScope.upsert({
                where: {
                    staff_id_warehouse_id: {
                        staff_id: managerId,
                        warehouse_id: id,
                    },
                },
                create: {
                    scope_type: ScopeType.WAREHOUSE,
                    staff: { connect: { id: managerId } },
                    warehouse: { connect: { id } },
                },
                update: {},
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.SCOPE_REMOVED,
                    staff_id: previousManager.id,
                    staff_name: previousManager.name,
                    performed_by_staff_id: performed_by.id,
                    performed_by_staff_name: performed_by.name,
                    market_id: market.id,
                    market_name: market.name,
                },
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.SCOPE_ASSIGNED,
                    staff_id: nextManager.id,
                    staff_name: nextManager.name,
                    performed_by_staff_id: performed_by.id,
                    performed_by_staff_name: performed_by.name,
                    market_id: market.id,
                    market_name: market.name,
                },
            });

            return warehouse;
        });
    }

    async close(id: string): Promise<WarehouseRecord> {
        return await this.prisma.warehouse.update({
            where: { id },
            data: { status: WarehouseStatus.CLOSED },
        });
    }

    async open(id: string): Promise<WarehouseRecord> {
        return await this.prisma.warehouse.update({
            where: { id },
            data: { status: WarehouseStatus.OPEN },
        });
    }

    async assignStaff(
        warehouseId: string,
        staffMembers: WarehouseAuditActor[],
        performed_by: WarehouseAuditActor,
        market: WarehouseAuditActor,
    ): Promise<WarehouseStaffMember[]> {
        const staffIds = staffMembers.map((member) => member.id);

        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staffScope.findMany({
                where: {
                    warehouse_id: warehouseId,
                    staff_id: { in: staffIds },
                    scope_type: ScopeType.WAREHOUSE,
                },
                select: { staff_id: true },
            });
            const alreadyAssigned = new Set(
                existing.map((scope) => scope.staff_id),
            );
            const toAssign = staffMembers.filter(
                (member) => !alreadyAssigned.has(member.id),
            );

            if (toAssign.length > 0) {
                await tx.staffScope.createMany({
                    data: toAssign.map((member) => ({
                        staff_id: member.id,
                        scope_type: ScopeType.WAREHOUSE,
                        warehouse_id: warehouseId,
                    })),
                });

                await tx.staffAudit.createMany({
                    data: toAssign.map((member) => ({
                        action: StaffAuditAction.SCOPE_ASSIGNED,
                        staff_id: member.id,
                        staff_name: member.name,
                        performed_by_staff_id: performed_by.id,
                        performed_by_staff_name: performed_by.name,
                        market_id: market.id,
                        market_name: market.name,
                    })),
                });
            }

            const scopes = await tx.staffScope.findMany({
                where: {
                    warehouse_id: warehouseId,
                    staff_id: { in: staffIds },
                    scope_type: ScopeType.WAREHOUSE,
                },
                select: warehouseStaffSelect,
                orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            });

            return scopes.map((scope) => ({
                ...scope,
                warehouse_id: scope.warehouse_id ?? warehouseId,
            }));
        });
    }
}
