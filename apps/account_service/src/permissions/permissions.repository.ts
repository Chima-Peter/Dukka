import { Injectable } from '@nestjs/common';
import type { Permission } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PermissionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<Permission[]> {
        return await this.prisma.permission.findMany({
            orderBy: { created_at: 'desc' },
        });
    }
}
