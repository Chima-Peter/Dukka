import { Injectable } from '@nestjs/common';
import {
    type Permission,
    type ScopeType,
    PrismaService,
} from '@app/common';

@Injectable()
export class PermissionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(scope_types: ScopeType[]): Promise<Permission[]> {
        if (scope_types.length === 0) {
            return [];
        }

        return await this.prisma.permission.findMany({
            where: { scope_type: { in: scope_types } },
            orderBy: [{ scope_type: 'asc' }, { name: 'asc' }],
        });
    }

    async findNamesByStaffId(staffId: string): Promise<string[] | null> {
        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
            select: {
                role: {
                    select: {
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

        if (!staff) {
            return null;
        }

        return (
            staff.role?.role_permissions.map(
                (rolePermission) => rolePermission.permission.name,
            ) ?? []
        );
    }
}
