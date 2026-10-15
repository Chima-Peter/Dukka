import { Injectable } from '@nestjs/common';
import type { Market } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMarketDto } from './dto/create-market.dto.js';
import type { UpdateMarketDto } from './dto/update-market.dto.js';

@Injectable()
export class MarketsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateMarketDto): Promise<Market> {
        return await this.prisma.market.create({ data });
    }

    async findAll(): Promise<Market[]> {
        return await this.prisma.market.findMany({
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<Market | null> {
        return await this.prisma.market.findUnique({ where: { id } });
    }

    async update(id: string, data: UpdateMarketDto): Promise<Market> {
        return await this.prisma.market.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.code !== undefined && { code: data.code }),
                ...(data.is_active !== undefined && {
                    is_active: data.is_active,
                }),
            },
        });
    }

    async delete(id: string): Promise<Market> {
        return await this.prisma.market.delete({ where: { id } });
    }
}
