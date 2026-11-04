import { Injectable } from '@nestjs/common';
import {
    StaffAuditAction,
    type Permission,
    type Role,
    type RolePermission,
    type ScopeType,
    PrismaService,
} from '@app/common';
import {
    assertCanManageHierarchies,
    assertCanManageScopeType,
    resolveQueriedRoleScopeTypes,
    visibleHierarchyFloor,
    visibleRoleScopeTypes,
} from '../shared/access-control.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

export const ROLES_REPO_ERROR = {
    PERFORMING_STAFF_NOT_FOUND: 'PERFORMING_STAFF_NOT_FOUND',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    PERMISSIONS_NOT_FOUND: 'PERMISSIONS_NOT_FOUND',
    PERMISSION_SCOPE_MISMATCH: 'PERMISSION_SCOPE_MISMATCH',
    SELF_ROLE_MODIFICATION: 'SELF_ROLE_MODIFICATION',
} as const;

export type RoleWithDetails = Role & {
    role_permissions: (RolePermission & { permission: Permission })[];
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
            select: {
                role: { select: { hierarchy: true, scope_type: true } },
            },
        });
        if (!actor) {
            throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        assertCanManageHierarchies(actor.role?.hierarchy, data.hierarchy);
        assertCanManageScopeType(actor.role?.scope_type, data.scope_type);

        return await this.prisma.role.create({ data });
    }

    async findAll(
        hierarchy: number | null,
        actor_scope_type: ScopeType | null,
        filter_scope_type?: ScopeType | null,
    ): Promise<Role[]> {
        if (hierarchy === null) {
            return [];
        }

        const scopes = resolveQueriedRoleScopeTypes(
            actor_scope_type,
            filter_scope_type,
        );
        if (scopes === null) {
            return [];
        }

        return await this.prisma.role.findMany({
            where: {
                hierarchy: { gte: visibleHierarchyFloor(hierarchy) },
                scope_type: { in: scopes },
            },
            orderBy: [{ hierarchy: 'asc' }, { created_at: 'desc' }],
        });
    }

    async findById(
        id: string,
        scope?: { hierarchy: number | null; scope_type: ScopeType | null },
    ): Promise<RoleWithDetails | null> {
        const visibleScopes =
            scope !== undefined
                ? visibleRoleScopeTypes(scope.scope_type)
                : undefined;
        if (
            scope !== undefined &&
            (scope.hierarchy === null || visibleScopes === null)
        ) {
            return null;
        }

        return await this.prisma.role.findFirst({
            where: {
                id,
                ...(scope !== undefined &&
                    scope.hierarchy !== null &&
                    visibleScopes != null && {
                        hierarchy: {
                            gte: visibleHierarchyFloor(scope.hierarchy),
                        },
                        scope_type: { in: visibleScopes },
                    }),
            },
            include: {
                role_permissions: {
                    include: { permission: true },
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
                role: { select: { hierarchy: true, scope_type: true } },
            },
        });
        if (!actor) {
            throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        const existing = await this.prisma.role.findUnique({
            where: { id },
            select: { id: true, hierarchy: true, scope_type: true },
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
        assertCanManageScopeType(
            actor.role?.scope_type,
            existing.scope_type,
            ...(data.scope_type !== undefined ? [data.scope_type] : []),
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
                ...(data.scope_type !== undefined && {
                    scope_type: data.scope_type,
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
                role: { select: { hierarchy: true, scope_type: true } },
            },
        });
        if (!actor) {
            throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        const existing = await this.prisma.role.findUnique({
            where: { id },
            select: { id: true, hierarchy: true, scope_type: true },
        });
        if (!existing) {
            throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
        }

        this.assertNotOwnRole(actor.role_id, existing.id);
        assertCanManageHierarchies(
            actor.role?.hierarchy,
            existing.hierarchy,
        );
        assertCanManageScopeType(actor.role?.scope_type, existing.scope_type);

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
                            scope_type: true,
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: role_id },
                select: {
                    id: true,
                    name: true,
                    hierarchy: true,
                    scope_type: true,
                },
            });
            if (!role) {
                throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
            }

            this.assertNotOwnRole(actor.role_id, role.id);
            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertCanManageScopeType(actor.role?.scope_type, role.scope_type);

            const permissions = await tx.permission.findMany({
                where: { id: { in: permission_ids } },
                select: { id: true, name: true, scope_type: true },
            });
            if (permissions.length !== permission_ids.length) {
                throw new Error(ROLES_REPO_ERROR.PERMISSIONS_NOT_FOUND);
            }
            if (
                permissions.some(
                    (permission) => permission.scope_type !== role.scope_type,
                )
            ) {
                throw new Error(ROLES_REPO_ERROR.PERMISSION_SCOPE_MISMATCH);
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
                            scope_type: true,
                        },
                    },
                },
            });
            if (!actor) {
                throw new Error(ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: role_id },
                select: {
                    id: true,
                    name: true,
                    hierarchy: true,
                    scope_type: true,
                },
            });
            if (!role) {
                throw new Error(ROLES_REPO_ERROR.ROLE_NOT_FOUND);
            }

            this.assertNotOwnRole(actor.role_id, role.id);
            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertCanManageScopeType(actor.role?.scope_type, role.scope_type);

            const existing = await tx.rolePermission.findMany({
                where: {
                    role_id,
                    permission_id: { in: permission_ids },
                },
                include: {
                    permission: {
                        select: { id: true, name: true, scope_type: true },
                    },
                },
            });

            if (existing.length === 0) {
                return 0;
            }

            if (
                existing.some(
                    (row) => row.permission.scope_type !== role.scope_type,
                )
            ) {
                throw new Error(ROLES_REPO_ERROR.PERMISSION_SCOPE_MISMATCH);
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
