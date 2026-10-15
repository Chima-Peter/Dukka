import { Injectable } from '@nestjs/common';
import type { Permission } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePermissionDto } from './dto/create-permission.dto.js';
import type { UpdatePermissionDto } from './dto/update-permission.dto.js';

@Injectable()
export class PermissionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreatePermissionDto): Promise<Permission> {
        return await this.prisma.permission.create({ data });
    }

    async findAll(): Promise<Permission[]> {
        return await this.prisma.permission.findMany({
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<Permission | null> {
        return await this.prisma.permission.findUnique({ where: { id } });
    }

    async update(id: string, data: UpdatePermissionDto): Promise<Permission> {
        return await this.prisma.permission.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
            },
        });
    }

    async delete(id: string): Promise<Permission> {
        return await this.prisma.permission.delete({ where: { id } });
    }
}
