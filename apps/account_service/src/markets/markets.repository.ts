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

    async findAll(market_ids: string[]): Promise<Market[]> {
        if (market_ids.length === 0) {
            return [];
        }

        return await this.prisma.market.findMany({
            where: { id: { in: market_ids } },
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(
        id: string,
        market_ids: string[],
    ): Promise<Market | null> {
        if (market_ids.length === 0 || !market_ids.includes(id)) {
            return null;
        }

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
