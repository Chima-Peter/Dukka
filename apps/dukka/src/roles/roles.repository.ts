import { Injectable } from '@nestjs/common';
import {
    StaffAuditAction,
    type Market,
    type Permission,
    type Role,
    type RoleMarket,
    type RolePermission,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
    assertActorBelongsToMarkets,
    assertActorHasPermissions,
    assertCanManageHierarchies,
    visibleHierarchyFloor,
} from '../shared/access-control.js';
import { assertMarketsActive } from '../shared/assert-markets-active.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

export const ROLES_REPO_ERROR = {
    PERFORMING_STAFF_NOT_FOUND: 'PERFORMING_STAFF_NOT_FOUND',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    PERMISSIONS_NOT_FOUND: 'PERMISSIONS_NOT_FOUND',
    MARKETS_NOT_FOUND: 'MARKETS_NOT_FOUND',
    SELF_ROLE_MODIFICATION: 'SELF_ROLE_MODIFICATION',
} as const;

export type RoleWithDetails = Role & {
    role_permissions: (RolePermission & { permission: Permission })[];
    role_markets: (RoleMarket & { market: Market })[];
};

@Injectable()
export class RolesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: CreateRoleDto,
        performed_by_staff_id: string,
    ): Promise<Role> {
        const actor = await this.prisma.staff.findUnique({
            where: { id: performed_by_staff_id },
            select: { role: { select: { hierarchy: true } } },
        });
        if (!actor) {
            throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        assertCanManageHierarchies(actor.role?.hierarchy, data.hierarchy);

        return await this.prisma.role.create({ data });
    }

    async findAll(
        market_ids: string[],
        hierarchy: number | null,
    ): Promise<Role[]> {
        if (market_ids.length === 0 || hierarchy === null) {
            return [];
        }

        return await this.prisma.role.findMany({
            where: {
                hierarchy: { gte: visibleHierarchyFloor(hierarchy) },
                role_markets: {
                    some: { market_id: { in: market_ids } },
                },
            },
            orderBy: [{ hierarchy: 'asc' }, { created_at: 'desc' }],
        });
    }

    async findById(
        id: string,
        scope?: { market_ids: string[]; hierarchy: number | null },
    ): Promise<RoleWithDetails | null> {
        if (
            scope !== undefined &&
            (scope.market_ids.length === 0 || scope.hierarchy === null)
        ) {
            return null;
        }

        return await this.prisma.role.findFirst({
            where: {
                id,
                ...(scope !== undefined &&
                    scope.hierarchy !== null && {
                        hierarchy: {
                            gte: visibleHierarchyFloor(scope.hierarchy),
                        },
                        role_markets: {
                            some: { market_id: { in: scope.market_ids } },
                        },
                    }),
            },
            include: {
                role_permissions: {
                    include: { permission: true },
                    orderBy: { created_at: 'desc' },
                },
                role_markets: {
                    include: { market: true },
                    orderBy: { created_at: 'desc' },
                },
            },
        });
    }

    async update(
        id: string,
        data: UpdateRoleDto,
        performed_by_staff_id: string,
    ): Promise<Role> {
        const actor = await this.prisma.staff.findUnique({
            where: { id: performed_by_staff_id },
            select: {
                role_id: true,
                role: { select: { hierarchy: true } },
            },
        });
        if (!actor) {
            throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        const existing = await this.prisma.role.findUnique({
            where: { id },
            select: { id: true, hierarchy: true },
        });
        if (!existing) {
            throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
        }

        this.assertNotOwnRole(actor.role_id, existing.id);
        assertCanManageHierarchies(
            actor.role?.hierarchy,
            existing.hierarchy,
            data.hierarchy,
        );

        return await this.prisma.role.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.hierarchy !== undefined && {
                    hierarchy: data.hierarchy,
                }),
            },
        });
    }

    async delete(
        id: string,
        performed_by_staff_id: string,
    ): Promise<Role> {
        const actor = await this.prisma.staff.findUnique({
            where: { id: performed_by_staff_id },
            select: {
                role_id: true,
                role: { select: { hierarchy: true } },
            },
        });
        if (!actor) {
            throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        const existing = await this.prisma.role.findUnique({
            where: { id },
            select: { id: true, hierarchy: true },
        });
        if (!existing) {
            throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
        }

        this.assertNotOwnRole(actor.role_id, existing.id);
        assertCanManageHierarchies(
            actor.role?.hierarchy,
            existing.hierarchy,
        );

        return await this.prisma.role.delete({ where: { id } });
    }

    async findStaffContactsByRoleId(
        role_id: string,
    ): Promise<{ email: string; name: string }[]> {
        return await this.prisma.staff.findMany({
            where: {
                role_id,
                is_active: true,
            },
            select: {
                email: true,
                name: true,
            },
        });
    }

    async assignPermissions(
        role_id: string,
        permission_ids: string[],
        performed_by_staff_id: string,
    ): Promise<(RolePermission & { permission: Permission })[]> {
        return await this.prisma.$transaction(async (tx) => {
            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    role_id: true,
                    role: {
                        select: {
                            hierarchy: true,
                            role_permissions: {
                                select: { permission_id: true },
                            },
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: role_id },
                select: { id: true, name: true, hierarchy: true },
            });
            if (!role) {
                throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
            }

            this.assertNotOwnRole(actor.role_id, role.id);
            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertActorHasPermissions(
                actor.role?.role_permissions.map((rp) => rp.permission_id) ??
                    [],
                permission_ids,
            );

            const permissions = await tx.permission.findMany({
                where: { id: { in: permission_ids } },
                select: { id: true, name: true },
            });
            if (permissions.length !== permission_ids.length) {
                throw new Error(ROLES_REPO_ERROR.PERMISSIONS_NOT_FOUND);
            }

            await tx.rolePermission.createMany({
                data: permission_ids.map((permission_id) => ({
                    role_id,
                    permission_id,
                })),
            });

            await tx.staffAudit.createMany({
                data: permissions.map((permission) => ({
                    action: StaffAuditAction.PERMISSION_ASSIGNED,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: role.id,
                    role_name: role.name,
                    permission_id: permission.id,
                    permission_name: permission.name,
                })),
            });

            return await tx.rolePermission.findMany({
                where: {
                    role_id,
                    permission_id: { in: permission_ids },
                },
                include: { permission: true },
                orderBy: { created_at: 'desc' },
            });
        });
    }

    async removePermissions(
        role_id: string,
        permission_ids: string[],
        performed_by_staff_id: string,
    ): Promise<number> {
        return await this.prisma.$transaction(async (tx) => {
            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    role_id: true,
                    role: {
                        select: {
                            hierarchy: true,
                            role_permissions: {
                                select: { permission_id: true },
                            },
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: role_id },
                select: { id: true, name: true, hierarchy: true },
            });
            if (!role) {
                throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
            }

            this.assertNotOwnRole(actor.role_id, role.id);
            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertActorHasPermissions(
                actor.role?.role_permissions.map((rp) => rp.permission_id) ??
                    [],
                permission_ids,
            );

            const existing = await tx.rolePermission.findMany({
                where: {
                    role_id,
                    permission_id: { in: permission_ids },
                },
                include: { permission: { select: { id: true, name: true } } },
            });

            if (existing.length === 0) {
                return 0;
            }

            const result = await tx.rolePermission.deleteMany({
                where: {
                    role_id,
                    permission_id: {
                        in: existing.map((row) => row.permission_id),
                    },
                },
            });

            await tx.staffAudit.createMany({
                data: existing.map((row) => ({
                    action: StaffAuditAction.PERMISSION_REMOVED,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: role.id,
                    role_name: role.name,
                    permission_id: row.permission.id,
                    permission_name: row.permission.name,
                })),
            });

            return result.count;
        });
    }

    async assignMarkets(
        role_id: string,
        market_ids: string[],
        performed_by_staff_id: string,
    ): Promise<(RoleMarket & { market: Market })[]> {
        return await this.prisma.$transaction(async (tx) => {
            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    role_id: true,
                    staff_markets: { select: { market_id: true } },
                    role: {
                        select: {
                            hierarchy: true,
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: role_id },
                select: { id: true, name: true, hierarchy: true },
            });
            if (!role) {
                throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
            }

            this.assertNotOwnRole(actor.role_id, role.id);
            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertActorBelongsToMarkets(
                actor.staff_markets.map((sm) => sm.market_id),
                market_ids,
            );

            const markets = await tx.market.findMany({
                where: { id: { in: market_ids } },
                select: { id: true, name: true, status: true },
            });
            if (markets.length !== market_ids.length) {
                throw new Error(ROLES_REPO_ERROR.MARKETS_NOT_FOUND);
            }
            assertMarketsActive(markets);

            await tx.roleMarket.createMany({
                data: market_ids.map((market_id) => ({
                    role_id,
                    market_id,
                })),
            });

            await tx.staffAudit.createMany({
                data: markets.map((market) => ({
                    action: StaffAuditAction.MARKET_ASSIGNED,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: role.id,
                    role_name: role.name,
                    market_id: market.id,
                    market_name: market.name,
                })),
            });

            return await tx.roleMarket.findMany({
                where: {
                    role_id,
                    market_id: { in: market_ids },
                },
                include: { market: true },
                orderBy: { created_at: 'desc' },
            });
        });
    }

    async removeMarkets(
        role_id: string,
        market_ids: string[],
        performed_by_staff_id: string,
    ): Promise<number> {
        return await this.prisma.$transaction(async (tx) => {
            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    role_id: true,
                    staff_markets: { select: { market_id: true } },
                    role: {
                        select: {
                            hierarchy: true,
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: role_id },
                select: { id: true, name: true, hierarchy: true },
            });
            if (!role) {
                throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
            }

            this.assertNotOwnRole(actor.role_id, role.id);
            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertActorBelongsToMarkets(
                actor.staff_markets.map((sm) => sm.market_id),
                market_ids,
            );

            const existing = await tx.roleMarket.findMany({
                where: {
                    role_id,
                    market_id: { in: market_ids },
                },
                include: { market: { select: { id: true, name: true } } },
            });

            if (existing.length === 0) {
                return 0;
            }

            const result = await tx.roleMarket.deleteMany({
                where: {
                    role_id,
                    market_id: {
                        in: existing.map((row) => row.market_id),
                    },
                },
            });

            await tx.staffAudit.createMany({
                data: existing.map((row) => ({
                    action: StaffAuditAction.MARKET_REMOVED,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: role.id,
                    role_name: role.name,
                    market_id: row.market.id,
                    market_name: row.market.name,
                })),
            });

            return result.count;
        });
    }

    async exists(id: string): Promise<boolean> {
        const role = await this.prisma.role.findUnique({
            where: { id },
            select: { id: true },
        });
        return role !== null;
    }

    private assertNotOwnRole(
        actor_role_id: string | null,
        role_id: string,
    ): void {
        if (actor_role_id === role_id) {
            throw new Error(ROLES_REPO_ERROR.SELF_ROLE_MODIFICATION);
        }
    }

    async hasPermission(
        role_id: string,
        permission_name: string,
    ): Promise<boolean> {
        const assignment = await this.prisma.rolePermission.findFirst({
            where: {
                role_id,
                permission: { name: permission_name },
            },
            select: { id: true },
        });
        return assignment !== null;
    }
}
