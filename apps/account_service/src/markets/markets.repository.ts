import { Injectable } from '@nestjs/common';
import type { Market } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMarketDto } from './dto/create-market.dto.js';
import type { UpdateMarketDto } from './dto/update-market.dto.js';

export type MarketCurrencySummary = {
    id: string;
    code: string;
    name: string;
};

export type MarketWithCurrency = Market & {
    currency: MarketCurrencySummary;
};

const marketWithCurrency = {
    currency: {
        select: {
            id: true,
            code: true,
            name: true,
        },
    },
} as const;

@Injectable()
export class MarketsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateMarketDto): Promise<MarketWithCurrency> {
        return await this.prisma.market.create({
            data,
            include: marketWithCurrency,
        });
    }

    async findAll(market_ids: string[]): Promise<MarketWithCurrency[]> {
        if (market_ids.length === 0) {
            return [];
        }

        return await this.prisma.market.findMany({
            where: { id: { in: market_ids } },
            include: marketWithCurrency,
            orderBy: { created_at: 'desc' },
        });
    }

    async findExistingByIds(
        marketIds: string[],
    ): Promise<{ id: string; is_active: boolean }[]> {
        if (marketIds.length === 0) {
            return [];
        }

        return await this.prisma.market.findMany({
            where: { id: { in: marketIds } },
            select: { id: true, is_active: true },
        });
    }

    async findById(
        id: string,
        market_ids: string[],
    ): Promise<MarketWithCurrency | null> {
        if (market_ids.length === 0 || !market_ids.includes(id)) {
            return null;
        }

        return await this.prisma.market.findUnique({
            where: { id },
            include: marketWithCurrency,
        });
    }

    async update(
        id: string,
        data: UpdateMarketDto,
    ): Promise<MarketWithCurrency> {
        return await this.prisma.market.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.code !== undefined && { code: data.code }),
                ...(data.currency_id !== undefined && {
                    currency_id: data.currency_id,
                }),
            },
            include: marketWithCurrency,
        });
    }

    async setActive(
        id: string,
        is_active: boolean,
    ): Promise<MarketWithCurrency> {
        return await this.prisma.market.update({
            where: { id },
            data: { is_active },
            include: marketWithCurrency,
        });
    }

    async delete(id: string): Promise<Market> {
        return await this.prisma.market.delete({ where: { id } });
    }

    async findStaffContactsByMarketId(
        market_id: string,
    ): Promise<{ email: string; name: string }[]> {
        return await this.prisma.staff.findMany({
            where: {
                is_active: true,
                staff_markets: {
                    some: { market_id },
                },
            },
            select: {
                email: true,
                name: true,
            },
        });
    }
}
