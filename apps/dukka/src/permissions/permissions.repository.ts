import { Injectable } from '@nestjs/common';
import { type Permission, PrismaService } from '@app/common';

@Injectable()
export class PermissionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<Permission[]> {
        return await this.prisma.permission.findMany({
            orderBy: { created_at: 'desc' },
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
