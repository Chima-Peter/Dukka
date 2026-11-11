import { Injectable } from '@nestjs/common';
import {
    ScopeType,
    StaffAuditAction,
    type Prisma,
    type Qualification,
    type Staff,
    type StaffProfile,
    PrismaService,
} from '@app/common';
import {
    assertActorBelongsToMarkets,
    assertActorHasScopedAccess,
    assertCanManageRole,
    assertCanManageStaffInMarkets,
    hasGlobalScope,
    resolveActorDistributionPointIds,
    resolveActorWarehouseIds,
    resolveScopeMarketIds,
    visibleHierarchyFloor,
    type ScopedAccessActor,
    type StaffScopeRef,
} from '../shared/access-control.js';
import { assertMarketsActive } from '../shared/assert-markets-active.js';
import type { AssignStaffScopeDto } from './dto/assign-scope.dto.js';
import type { CreateQualificationDto } from './dto/create-qualification.dto.js';
import type { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import type { FindStaffAuditDto } from './dto/find-staff-audit.dto.js';
import type { FindStaffDto } from './dto/find-staff.dto.js';
import type { RemoveStaffScopeDto } from './dto/remove-scope.dto.js';
import type { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import {
    STAFF_REPO_ERROR,
    type StaffAuditPage,
    type StaffAuthRecord,
    type StaffPage,
    type StaffQualificationSummary,
    type StaffRoleDetails,
    type StaffScopeDetails,
    type StaffMemberSummary,
    type StaffSummary,
    type StaffWithDetails,
} from './types/staff.types.js';

import { staffDetailsInclude } from './mappers/staff.mapper.js';

const staffScopeAccessSelect = {
    market_id: true,
    scope_type: true,
    warehouse_id: true,
    distribution_point_id: true,
    warehouse: { select: { market_id: true } },
    distribution_point: { select: { market_id: true } },
} as const;

@Injectable()
export class StaffRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        query: FindStaffDto,
        actor: {
            scopes: readonly StaffScopeRef[];
            market_ids: readonly string[];
            hierarchy: number | null;
        },
    ): Promise<StaffPage> {
        if (actor.hierarchy === null) {
            return { items: [], next_cursor: null };
        }

        const scopeFilter = this.buildActorStaffScopeFilter(
            actor,
            query.market_id,
        );
        if (scopeFilter === null) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 20;
        const where = this.buildFindWhere(
            query,
            actor.hierarchy,
            scopeFilter,
        );

        const records = await this.prisma.staff.findMany({
            where,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: { select: { name: true } },
            },
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map((item) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            avatar: item.avatar,
            role_name: item.role?.name ?? null,
        }));

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findSummariesByMarketId(
        marketId: string,
    ): Promise<StaffMemberSummary[]> {
        return this.findSummariesByScope({
            scope_type: ScopeType.MARKET,
            market_id: marketId,
        });
    }

    async findSummariesByWarehouseId(
        warehouseId: string,
    ): Promise<StaffMemberSummary[]> {
        return this.findSummariesByScope({
            scope_type: ScopeType.WAREHOUSE,
            warehouse_id: warehouseId,
        });
    }

    async findSummariesByDistributionPointId(
        distributionPointId: string,
    ): Promise<StaffMemberSummary[]> {
        return this.findSummariesByScope({
            scope_type: ScopeType.DISTRIBUTION_POINT,
            distribution_point_id: distributionPointId,
        });
    }

    private async findSummariesByScope(scope: {
        scope_type:
            | typeof ScopeType.MARKET
            | typeof ScopeType.WAREHOUSE
            | typeof ScopeType.DISTRIBUTION_POINT;
        market_id?: string;
        warehouse_id?: string;
        distribution_point_id?: string;
    }): Promise<StaffMemberSummary[]> {
        const records = await this.prisma.staff.findMany({
            where: {
                is_active: true,
                staff_scopes: {
                    some: {
                        scope_type: scope.scope_type,
                        ...(scope.market_id !== undefined && {
                            market_id: scope.market_id,
                        }),
                        ...(scope.warehouse_id !== undefined && {
                            warehouse_id: scope.warehouse_id,
                        }),
                        ...(scope.distribution_point_id !== undefined && {
                            distribution_point_id: scope.distribution_point_id,
                        }),
                    },
                },
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                name: true,
                avatar: true,
                role: { select: { name: true } },
            },
        });

        return records.map((item) => ({
            id: item.id,
            name: item.name,
            role: item.role?.name ?? null,
            picture: item.avatar,
        }));
    }

    private buildActorStaffScopeFilter(
        actor: {
            scopes: readonly StaffScopeRef[];
            market_ids: readonly string[];
        },
        requested_market_id?: string,
    ): Prisma.StaffScopeListRelationFilter | true | null {
        if (hasGlobalScope(actor.scopes)) {
            if (requested_market_id !== undefined) {
                return { some: { market_id: requested_market_id } };
            }
            return true;
        }

        const hasMarketScope = actor.scopes.some(
            (scope) => scope.scope_type === 'MARKET',
        );
        if (hasMarketScope) {
            const marketIds =
                requested_market_id !== undefined
                    ? actor.market_ids.includes(requested_market_id)
                        ? [requested_market_id]
                        : []
                    : [...actor.market_ids];
            if (marketIds.length === 0) {
                return null;
            }
            return { some: { market_id: { in: marketIds } } };
        }

        const warehouseIds = resolveActorWarehouseIds(actor.scopes);
        if (warehouseIds.length > 0) {
            return {
                some: {
                    scope_type: 'WAREHOUSE',
                    warehouse_id: { in: warehouseIds },
                },
            };
        }

        const distributionPointIds = resolveActorDistributionPointIds(
            actor.scopes,
        );
        if (distributionPointIds.length > 0) {
            return {
                some: {
                    scope_type: 'DISTRIBUTION_POINT',
                    distribution_point_id: { in: distributionPointIds },
                },
            };
        }

        return null;
    }

    private buildFindWhere(
        query: FindStaffDto,
        hierarchy: number,
        scopeFilter: Prisma.StaffScopeListRelationFilter | true,
    ): Prisma.StaffWhereInput {
        return {
            ...(query.role_id !== undefined && { role_id: query.role_id }),
            ...(query.is_active !== undefined && {
                is_active: query.is_active,
            }),
            ...(scopeFilter !== true && {
                staff_scopes: scopeFilter,
            }),
            role: {
                hierarchy: { gte: visibleHierarchyFloor(hierarchy) },
                ...(query.permission_id !== undefined && {
                    role_permissions: {
                        some: { permission_id: query.permission_id },
                    },
                }),
            },
        };
    }

    async findById(id: string): Promise<StaffWithDetails | null> {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            include: staffDetailsInclude,
        });

        return staff ? this.omitPassword(staff) : null;
    }

    async findByIdInScope(
        id: string,
        actor: {
            scopes: readonly StaffScopeRef[];
            market_ids: readonly string[];
            hierarchy: number | null;
        },
    ): Promise<StaffWithDetails | null> {
        if (actor.hierarchy === null) {
            return null;
        }

        if (hasGlobalScope(actor.scopes)) {
            return this.findById(id);
        }

        const scopeFilter = this.buildActorStaffScopeFilter(actor);
        if (scopeFilter === null || scopeFilter === true) {
            return null;
        }

        const staff = await this.prisma.staff.findFirst({
            where: {
                id,
                staff_scopes: scopeFilter,
            },
            include: staffDetailsInclude,
        });

        return staff ? this.omitPassword(staff) : null;
    }

    async findByEmail(email: string): Promise<StaffAuthRecord | null> {
        return await this.prisma.staff.findUnique({
            where: { email },
            include: staffDetailsInclude,
        });
    }

    async findByIdWithPassword(id: string): Promise<Staff | null> {
        return await this.prisma.staff.findUnique({ where: { id } });
    }

    async updatePassword(email: string, password: string): Promise<Staff> {
        return await this.prisma.staff.update({
            where: { email },
            data: { password },
        });
    }

    async exists(id: string): Promise<boolean> {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            select: { id: true },
        });
        return staff !== null;
    }

    async findValidationByIds(ids: string[]): Promise<
        {
            id: string;
            name: string;
            is_active: boolean;
            role_scope_type: ScopeType | null;
            staff_scopes: Array<{
                scope_type: ScopeType;
                market_id: string | null;
                warehouse_id: string | null;
                distribution_point_id: string | null;
            }>;
            permissions: string[];
        }[]
    > {
        if (ids.length === 0) {
            return [];
        }

        const records = await this.prisma.staff.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                name: true,
                is_active: true,
                staff_scopes: {
                    select: {
                        scope_type: true,
                        market_id: true,
                        warehouse_id: true,
                        distribution_point_id: true,
                    },
                },
                role: {
                    select: {
                        scope_type: true,
                        role_permissions: {
                            select: {
                                permission: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        return records.map((staff) => ({
            id: staff.id,
            name: staff.name,
            is_active: staff.is_active,
            role_scope_type: staff.role?.scope_type ?? null,
            staff_scopes: staff.staff_scopes,
            permissions:
                staff.role?.role_permissions.map(
                    (rolePermission) => rolePermission.permission.name,
                ) ?? [],
        }));
    }

    async findAuditsByStaffId(
        staff_id: string,
        query: FindStaffAuditDto,
    ): Promise<StaffAuditPage> {
        const limit = query.limit ?? 20;

        const records = await this.prisma.staffAudit.findMany({
            where: {
                staff_id,
                ...(query.from_date !== undefined ||
                query.to_date !== undefined
                    ? {
                          created_at: {
                              ...(query.from_date !== undefined && {
                                  gte: new Date(query.from_date),
                              }),
                              ...(query.to_date !== undefined && {
                                  lte: new Date(query.to_date),
                              }),
                          },
                      }
                    : {}),
            },
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

    async update(
        id: string,
        data: UpdateStaffDto,
    ): Promise<StaffWithDetails> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            const staff = await tx.staff.update({
                where: { id },
                data: {
                    ...(data.name !== undefined && { name: data.name }),
                    ...(data.avatar_path !== undefined && {
                        avatar: data.avatar_path,
                    }),
                    ...(data.phone_number !== undefined && {
                        phone_number: data.phone_number,
                    }),
                    ...(data.is_active !== undefined && {
                        is_active: data.is_active,
                    }),
                },
                include: staffDetailsInclude,
            });

            return this.omitPassword(staff);
        });
    }

    async assignRole(
        id: string,
        role_id: string,
        performed_by_staff_id: string,
    ): Promise<StaffWithDetails> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
                include: {
                    staff_scopes: { select: staffScopeAccessSelect },
                    role: {
                        select: {
                            id: true,
                            name: true,
                            hierarchy: true,
                        },
                    },
                },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            if (performed_by_staff_id === existing.id) {
                throw new Error(STAFF_REPO_ERROR.SELF_ROLE_ASSIGNMENT);
            }

            if (existing.role_id === role_id) {
                return this.omitPassword(
                    await tx.staff.findUniqueOrThrow({
                        where: { id },
                        include: staffDetailsInclude,
                    }),
                );
            }

            const newRole = await tx.role.findUnique({
                where: { id: role_id },
                select: {
                    id: true,
                    name: true,
                    hierarchy: true,
                    scope_type: true,
                },
            });
            if (!newRole) {
                throw new Error(STAFF_REPO_ERROR.ROLE_NOT_FOUND);
            }

            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: { select: staffScopeAccessSelect },
                    role: {
                        select: {
                            hierarchy: true,
                            scope_type: true,
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            assertCanManageRole(
                actor.role ?? {},
                existing.role ?? {},
                newRole,
            );

            assertCanManageStaffInMarkets(
                resolveScopeMarketIds(actor.staff_scopes),
                resolveScopeMarketIds(existing.staff_scopes),
                hasGlobalScope(actor.staff_scopes),
            );

            const staff = await tx.staff.update({
                where: { id },
                data: {
                    role: { connect: { id: role_id } },
                },
                include: staffDetailsInclude,
            });

            await tx.staffAudit.create({
                data: {
                    action: existing.role
                        ? StaffAuditAction.ROLE_CHANGED
                        : StaffAuditAction.ROLE_ASSIGNED,
                    staff_id: staff.id,
                    staff_name: staff.name,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: newRole.id,
                    role_name: newRole.name,
                    previous_role_id: existing.role?.id,
                    previous_role_name: existing.role?.name,
                },
            });

            return this.omitPassword(staff);
        });
    }

    async revokeRole(
        id: string,
        performed_by_staff_id: string,
    ): Promise<{
        staff: StaffWithDetails;
        previous_role: { id: string; name: string };
    }> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
                include: {
                    staff_scopes: { select: staffScopeAccessSelect },
                    role: {
                        select: {
                            id: true,
                            name: true,
                            hierarchy: true,
                            scope_type: true,
                        },
                    },
                },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            if (performed_by_staff_id === existing.id) {
                throw new Error(STAFF_REPO_ERROR.SELF_ROLE_REVOCATION);
            }

            if (!existing.role) {
                throw new Error(STAFF_REPO_ERROR.ROLE_NOT_ASSIGNED);
            }

            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: { select: staffScopeAccessSelect },
                    role: {
                        select: {
                            hierarchy: true,
                            scope_type: true,
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            assertCanManageRole(actor.role ?? {}, existing.role);

            assertCanManageStaffInMarkets(
                resolveScopeMarketIds(actor.staff_scopes),
                resolveScopeMarketIds(existing.staff_scopes),
                hasGlobalScope(actor.staff_scopes),
            );

            const staff = await tx.staff.update({
                where: { id },
                data: {
                    role: { disconnect: true },
                },
                include: staffDetailsInclude,
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.ROLE_REVOKED,
                    staff_id: staff.id,
                    staff_name: staff.name,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    previous_role_id: existing.role.id,
                    previous_role_name: existing.role.name,
                },
            });

            return {
                staff: this.omitPassword(staff),
                previous_role: {
                    id: existing.role.id,
                    name: existing.role.name,
                },
            };
        });
    }

    async assignScopes(
        staff_id: string,
        data: AssignStaffScopeDto,
        performed_by_staff_id: string,
    ): Promise<StaffWithDetails> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id: staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: {
                        select: staffScopeAccessSelect,
                    },
                    role: { select: { hierarchy: true, scope_type: true } },
                },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            const existingIsGlobal = hasGlobalScope(existing.staff_scopes);

            if (performed_by_staff_id === existing.id) {
                throw new Error(STAFF_REPO_ERROR.SELF_SCOPE_MODIFICATION);
            }

            if (existingIsGlobal) {
                throw new Error(STAFF_REPO_ERROR.ALREADY_GLOBAL);
            }

            if (existing.role?.scope_type !== data.scope_type) {
                throw new Error(STAFF_REPO_ERROR.ROLE_SCOPE_MISMATCH);
            }

            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: {
                        select: staffScopeAccessSelect,
                    },
                    role: { select: { hierarchy: true, scope_type: true } },
                },
            });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            assertCanManageRole(
                actor.role ?? {},
                {
                    hierarchy: existing.role?.hierarchy,
                    scope_type: data.scope_type,
                },
            );

            const actorIsGlobal = hasGlobalScope(actor.staff_scopes);
            const actorMarketIds = resolveScopeMarketIds(actor.staff_scopes);

            assertCanManageStaffInMarkets(
                resolveScopeMarketIds(actor.staff_scopes),
                resolveScopeMarketIds(existing.staff_scopes),
                actorIsGlobal,
            );

            const auditMarkets: { id: string; name: string }[] = [];

            if (data.scope_type === ScopeType.GLOBAL) {
                await tx.staffScope.create({
                    data: {
                        staff_id,
                        scope_type: ScopeType.GLOBAL,
                    },
                });
                await tx.staffAudit.create({
                    data: {
                        action: StaffAuditAction.SCOPE_ASSIGNED,
                        staff_id: existing.id,
                        staff_name: existing.name,
                        performed_by_staff_id: actor.id,
                        performed_by_staff_name: actor.name,
                    },
                });
            } else if (data.scope_type === ScopeType.MARKET) {
                const market_ids = data.market_ids ?? [];
                const markets = await tx.market.findMany({
                    where: { id: { in: market_ids } },
                    select: { id: true, name: true, status: true },
                });
                if (markets.length !== market_ids.length) {
                    throw new Error(STAFF_REPO_ERROR.MARKETS_NOT_FOUND);
                }
                assertMarketsActive(markets);
                assertActorBelongsToMarkets(
                    actorMarketIds,
                    market_ids,
                    actorIsGlobal,
                );

                await tx.staffScope.createMany({
                    data: market_ids.map((market_id) => ({
                        staff_id,
                        scope_type: ScopeType.MARKET,
                        market_id,
                    })),
                    skipDuplicates: true,
                });
                auditMarkets.push(...markets);
            } else if (data.scope_type === ScopeType.WAREHOUSE) {
                const warehouse_ids = data.warehouse_ids ?? [];
                const warehouses = await tx.warehouse.findMany({
                    where: { id: { in: warehouse_ids } },
                    select: {
                        id: true,
                        market_id: true,
                        market: { select: { id: true, name: true } },
                    },
                });
                if (warehouses.length !== warehouse_ids.length) {
                    throw new Error(STAFF_REPO_ERROR.WAREHOUSES_NOT_FOUND);
                }
                this.assertActorCanAccessWarehouses(
                    actor.staff_scopes,
                    actorMarketIds,
                    warehouses,
                );

                await tx.staffScope.createMany({
                    data: warehouse_ids.map((warehouse_id) => ({
                        staff_id,
                        scope_type: ScopeType.WAREHOUSE,
                        warehouse_id,
                    })),
                    skipDuplicates: true,
                });
                auditMarkets.push(
                    ...warehouses.map((warehouse) => warehouse.market),
                );
            } else {
                const distribution_point_ids =
                    data.distribution_point_ids ?? [];
                const distributionPoints =
                    await tx.distributionPoint.findMany({
                        where: { id: { in: distribution_point_ids } },
                        select: {
                            id: true,
                            market_id: true,
                            market: { select: { id: true, name: true } },
                        },
                    });
                if (
                    distributionPoints.length !== distribution_point_ids.length
                ) {
                    throw new Error(
                        STAFF_REPO_ERROR.DISTRIBUTION_POINTS_NOT_FOUND,
                    );
                }
                this.assertActorCanAccessDistributionPoints(
                    actor.staff_scopes,
                    actorMarketIds,
                    distributionPoints,
                );

                await tx.staffScope.createMany({
                    data: distribution_point_ids.map(
                        (distribution_point_id) => ({
                            staff_id,
                            scope_type: ScopeType.DISTRIBUTION_POINT,
                            distribution_point_id,
                        }),
                    ),
                    skipDuplicates: true,
                });
                auditMarkets.push(
                    ...distributionPoints.map((point) => point.market),
                );
            }

            for (const market of this.uniqueById(auditMarkets)) {
                await tx.staffAudit.create({
                    data: {
                        action: StaffAuditAction.SCOPE_ASSIGNED,
                        staff_id: existing.id,
                        staff_name: existing.name,
                        performed_by_staff_id: actor.id,
                        performed_by_staff_name: actor.name,
                        market_id: market.id,
                        market_name: market.name,
                    },
                });
            }

            return this.omitPassword(
                await tx.staff.findUniqueOrThrow({
                    where: { id: staff_id },
                    include: staffDetailsInclude,
                }),
            );
        });
    }

    async removeScopes(
        staff_id: string,
        data: RemoveStaffScopeDto,
        performed_by_staff_id: string,
    ): Promise<{ staff: StaffWithDetails; removed: number }> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id: staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: {
                        select: staffScopeAccessSelect,
                    },
                    role: { select: { hierarchy: true } },
                },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            if (performed_by_staff_id === existing.id) {
                throw new Error(STAFF_REPO_ERROR.SELF_SCOPE_MODIFICATION);
            }

            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: {
                        select: staffScopeAccessSelect,
                    },
                    role: { select: { hierarchy: true, scope_type: true } },
                },
            });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            assertCanManageRole(
                actor.role ?? {},
                {
                    hierarchy: existing.role?.hierarchy,
                    scope_type: data.scope_type,
                },
            );
            const actorIsGlobal = hasGlobalScope(actor.staff_scopes);
            const actorMarketIds = resolveScopeMarketIds(actor.staff_scopes);

            assertCanManageStaffInMarkets(
                resolveScopeMarketIds(actor.staff_scopes),
                resolveScopeMarketIds(existing.staff_scopes),
                actorIsGlobal,
            );

            const auditMarkets: { id: string; name: string }[] = [];
            let removed = 0;

            if (data.scope_type === ScopeType.GLOBAL) {
                const result = await tx.staffScope.deleteMany({
                    where: {
                        staff_id,
                        scope_type: ScopeType.GLOBAL,
                    },
                });
                removed = result.count;
                if (removed > 0) {
                    await tx.staffAudit.create({
                        data: {
                            action: StaffAuditAction.SCOPE_REMOVED,
                            staff_id: existing.id,
                            staff_name: existing.name,
                            performed_by_staff_id: actor.id,
                            performed_by_staff_name: actor.name,
                        },
                    });
                }
            } else if (data.scope_type === ScopeType.MARKET) {
                const market_ids = data.market_ids ?? [];
                assertActorBelongsToMarkets(
                    actorMarketIds,
                    market_ids,
                    actorIsGlobal,
                );

                const markets = await tx.market.findMany({
                    where: { id: { in: market_ids } },
                    select: { id: true, name: true },
                });
                if (markets.length !== market_ids.length) {
                    throw new Error(STAFF_REPO_ERROR.MARKETS_NOT_FOUND);
                }
                const result = await tx.staffScope.deleteMany({
                    where: {
                        staff_id,
                        scope_type: ScopeType.MARKET,
                        market_id: { in: market_ids },
                    },
                });
                removed = result.count;
                auditMarkets.push(...markets);
            } else if (data.scope_type === ScopeType.WAREHOUSE) {
                const warehouse_ids = data.warehouse_ids ?? [];
                const warehouses = await tx.warehouse.findMany({
                    where: { id: { in: warehouse_ids } },
                    select: {
                        id: true,
                        market_id: true,
                        market: { select: { id: true, name: true } },
                    },
                });
                if (warehouses.length !== warehouse_ids.length) {
                    throw new Error(STAFF_REPO_ERROR.WAREHOUSES_NOT_FOUND);
                }
                this.assertActorCanAccessWarehouses(
                    actor.staff_scopes,
                    actorMarketIds,
                    warehouses,
                );

                const result = await tx.staffScope.deleteMany({
                    where: {
                        staff_id,
                        scope_type: ScopeType.WAREHOUSE,
                        warehouse_id: { in: warehouse_ids },
                    },
                });
                removed = result.count;
                auditMarkets.push(
                    ...warehouses.map((warehouse) => warehouse.market),
                );
            } else {
                const distribution_point_ids =
                    data.distribution_point_ids ?? [];
                const distributionPoints =
                    await tx.distributionPoint.findMany({
                        where: { id: { in: distribution_point_ids } },
                        select: {
                            id: true,
                            market_id: true,
                            market: { select: { id: true, name: true } },
                        },
                    });
                if (
                    distributionPoints.length !== distribution_point_ids.length
                ) {
                    throw new Error(
                        STAFF_REPO_ERROR.DISTRIBUTION_POINTS_NOT_FOUND,
                    );
                }
                this.assertActorCanAccessDistributionPoints(
                    actor.staff_scopes,
                    actorMarketIds,
                    distributionPoints,
                );

                const result = await tx.staffScope.deleteMany({
                    where: {
                        staff_id,
                        scope_type: ScopeType.DISTRIBUTION_POINT,
                        distribution_point_id: { in: distribution_point_ids },
                    },
                });
                removed = result.count;
                auditMarkets.push(
                    ...distributionPoints.map((point) => point.market),
                );
            }

            for (const market of this.uniqueById(auditMarkets)) {
                await tx.staffAudit.create({
                    data: {
                        action: StaffAuditAction.SCOPE_REMOVED,
                        staff_id: existing.id,
                        staff_name: existing.name,
                        performed_by_staff_id: actor.id,
                        performed_by_staff_name: actor.name,
                        market_id: market.id,
                        market_name: market.name,
                    },
                });
            }

            const staff = this.omitPassword(
                await tx.staff.findUniqueOrThrow({
                    where: { id: staff_id },
                    include: staffDetailsInclude,
                }),
            );

            return { staff, removed };
        });
    }

    async assertCanDeactivate(
        id: string,
        performed_by_staff_id: string,
    ): Promise<{
        email: string;
        name: string;
        performed_by_staff_name: string;
        role_id: string | null;
        role_name: string | null;
    }> {
        const existing = await this.prisma.staff.findUnique({
            where: { id },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        hierarchy: true,
                        scope_type: true,
                    },
                },
                staff_scopes: { select: staffScopeAccessSelect },
            },
        });
        if (!existing) {
            throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
        }
        if (!existing.is_active) {
            throw new Error(STAFF_REPO_ERROR.STAFF_INACTIVE);
        }

        if (performed_by_staff_id === existing.id) {
            throw new Error(STAFF_REPO_ERROR.SELF_DELETION);
        }

        const actor = await this.prisma.staff.findUnique({
            where: { id: performed_by_staff_id },
            select: {
                name: true,
                staff_scopes: { select: staffScopeAccessSelect },
                role: { select: { hierarchy: true, scope_type: true } },
            },
        });
        if (!actor) {
            throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        assertCanManageRole(actor.role ?? {}, existing.role ?? {});
        assertCanManageStaffInMarkets(
            resolveScopeMarketIds(actor.staff_scopes),
            resolveScopeMarketIds(existing.staff_scopes),
            hasGlobalScope(actor.staff_scopes),
        );

        return {
            email: existing.email,
            name: existing.name,
            performed_by_staff_name: actor.name,
            role_id: existing.role?.id ?? null,
            role_name: existing.role?.name ?? null,
        };
    }

    async createProfile(
        staff_id: string,
        data: CreateStaffProfileDto,
    ): Promise<StaffProfile> {
        return await this.prisma.staffProfile.create({
            data: {
                staff: { connect: { id: staff_id } },
                ...(data.job_title !== undefined && {
                    job_title: data.job_title,
                }),
                ...(data.bio !== undefined && { bio: data.bio }),
                ...(data.date_of_birth !== undefined && {
                    date_of_birth: new Date(data.date_of_birth),
                }),
                ...(data.gender !== undefined && { gender: data.gender }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.hire_date !== undefined && {
                    hire_date: new Date(data.hire_date),
                }),
            },
        });
    }

    async findProfileByStaffId(
        staff_id: string,
    ): Promise<StaffProfile | null> {
        return await this.prisma.staffProfile.findUnique({
            where: { staff_id },
        });
    }

    async updateProfile(
        staff_id: string,
        data: UpdateStaffProfileDto,
    ): Promise<StaffProfile> {
        return await this.prisma.staffProfile.update({
            where: { staff_id },
            data: {
                ...(data.job_title !== undefined && {
                    job_title: data.job_title,
                }),
                ...(data.bio !== undefined && { bio: data.bio }),
                ...(data.date_of_birth !== undefined && {
                    date_of_birth: new Date(data.date_of_birth),
                }),
                ...(data.gender !== undefined && { gender: data.gender }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.hire_date !== undefined && {
                    hire_date: new Date(data.hire_date),
                }),
            },
        });
    }

    async createQualification(
        staff_id: string,
        data: CreateQualificationDto,
    ): Promise<Qualification> {
        return await this.prisma.qualification.create({
            data: {
                staff: { connect: { id: staff_id } },
                title: data.title,
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.document_path !== undefined && {
                    document_url: data.document_path,
                }),
            },
        });
    }

    async findQualificationsByStaffId(
        staff_id: string,
    ): Promise<Qualification[]> {
        return await this.prisma.qualification.findMany({
            where: { staff_id },
            orderBy: { created_at: 'desc' },
        });
    }

    async findQualificationById(
        id: string,
    ): Promise<Qualification | null> {
        return await this.prisma.qualification.findUnique({ where: { id } });
    }

    async updateQualification(
        id: string,
        data: UpdateQualificationDto,
    ): Promise<Qualification> {
        return await this.prisma.qualification.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.document_path !== undefined && {
                    document_url: data.document_path,
                }),
            },
        });
    }

    async deleteQualification(id: string): Promise<Qualification> {
        return await this.prisma.qualification.delete({ where: { id } });
    }

    private toScopedAccessActor(
        scopes: Array<{
            scope_type: ScopeType;
            market_id: string | null;
            warehouse_id: string | null;
            distribution_point_id: string | null;
        }>,
        market_ids: string[],
    ): ScopedAccessActor {
        return {
            scopes,
            market_ids,
        };
    }

    private assertActorCanAccessWarehouses(
        scopes: Array<{
            scope_type: ScopeType;
            market_id: string | null;
            warehouse_id: string | null;
            distribution_point_id: string | null;
        }>,
        market_ids: string[],
        warehouses: Array<{ id: string; market_id: string }>,
    ): void {
        const actor = this.toScopedAccessActor(scopes, market_ids);
        for (const warehouse of warehouses) {
            assertActorHasScopedAccess(actor, {
                market_id: warehouse.market_id,
                warehouse_id: warehouse.id,
            });
        }
    }

    private assertActorCanAccessDistributionPoints(
        scopes: Array<{
            scope_type: ScopeType;
            market_id: string | null;
            warehouse_id: string | null;
            distribution_point_id: string | null;
        }>,
        market_ids: string[],
        points: Array<{ id: string; market_id: string }>,
    ): void {
        const actor = this.toScopedAccessActor(scopes, market_ids);
        for (const point of points) {
            assertActorHasScopedAccess(actor, {
                market_id: point.market_id,
                distribution_point_id: point.id,
            });
        }
    }

    private uniqueById<T extends { id: string }>(items: T[]): T[] {
        const seen = new Set<string>();
        return items.filter((item) => {
            if (seen.has(item.id)) {
                return false;
            }
            seen.add(item.id);
            return true;
        });
    }

    private omitPassword(
        staff: Staff & {
            profile: StaffProfile | null;
            qualifications: StaffQualificationSummary[];
            role: StaffRoleDetails | null;
            staff_scopes: StaffScopeDetails[];
        },
    ): StaffWithDetails {
        const { password: _, ...rest } = staff;
        return rest;
    }
}
