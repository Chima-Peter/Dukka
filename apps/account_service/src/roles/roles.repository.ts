import { Injectable } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class RolesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateRoleDto): Promise<Role> {
        return await this.prisma.role.create({ data });
    }

    async findAll(): Promise<Role[]> {
        return await this.prisma.role.findMany({
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<Role | null> {
        return await this.prisma.role.findUnique({ where: { id } });
    }

    async update(id: string, data: UpdateRoleDto): Promise<Role> {
        return await this.prisma.role.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
            },
        });
    }

    async delete(id: string): Promise<Role> {
        return await this.prisma.role.delete({ where: { id } });
    }
}
