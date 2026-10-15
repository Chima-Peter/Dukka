import { Injectable } from '@nestjs/common';
import {
    RolePermissionAuditAction,
    type Permission,
    type Role,
    type RolePermission,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

export type RoleWithPermissions = Role & {
    role_permissions: (RolePermission & { permission: Permission })[];
};

@Injectable()
export class RolesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateRoleDto): Promise<Role> {
        return await this.prisma.role.create({ data });
    }

    async findAll(): Promise<Role[]> {
        return await this.prisma.role.findMany({
            orderBy: [{ hierarchy: 'asc' }, { created_at: 'desc' }],
        });
    }

    async findById(id: string): Promise<RoleWithPermissions | null> {
        return await this.prisma.role.findUnique({
            where: { id },
            include: {
                role_permissions: {
                    include: { permission: true },
                    orderBy: { created_at: 'desc' },
                },
            },
        });
    }

    async update(id: string, data: UpdateRoleDto): Promise<Role> {
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

    async delete(id: string): Promise<Role> {
        return await this.prisma.role.delete({ where: { id } });
    }

    async assignPermissions(
        role_id: string,
        permission_ids: string[],
        staff_id: string,
    ): Promise<(RolePermission & { permission: Permission })[]> {
        return await this.prisma.$transaction(async (tx) => {
            await tx.rolePermission.createMany({
                data: permission_ids.map((permission_id) => ({
                    role_id,
                    permission_id,
                })),
            });

            await tx.rolePermissionAudit.createMany({
                data: permission_ids.map((permission_id) => ({
                    action: RolePermissionAuditAction.ASSIGNED,
                    role_id,
                    permission_id,
                    staff_id,
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
        staff_id: string,
    ): Promise<number> {
        return await this.prisma.$transaction(async (tx) => {
            const result = await tx.rolePermission.deleteMany({
                where: {
                    role_id,
                    permission_id: { in: permission_ids },
                },
            });

            if (result.count === 0) {
                return 0;
            }

            await tx.rolePermissionAudit.createMany({
                data: permission_ids.map((permission_id) => ({
                    action: RolePermissionAuditAction.REMOVED,
                    role_id,
                    permission_id,
                    staff_id,
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
