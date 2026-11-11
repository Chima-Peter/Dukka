import { Injectable } from '@nestjs/common';
import { MarketStatus, type Market, PrismaService } from '@app/common';
import type { CreateMarketDto } from './dto/create-market.dto.js';
import type { UpdateMarketDto } from './dto/update-market.dto.js';
import {
    marketSummarySelect,
    type MarketSummaryRow,
} from './mappers/market.mapper.js';
import {
    marketWithCurrency,
    type MarketSearchMatch,
    type MarketWithCurrency,
} from './types/market.type.js';

@Injectable()
export class MarketsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateMarketDto): Promise<MarketWithCurrency> {
        return await this.prisma.market.create({
            data: {
                name: data.name,
                code: data.code,
                iso2: data.iso2,
                iso3: data.iso3,
                cash_limit: data.cash_limit,
                currency: { connect: { id: data.currency_id } },
            },
            include: marketWithCurrency,
        });
    }

    async findAll(
        market_ids: string[],
        status?: MarketStatus,
    ): Promise<MarketSummaryRow[]> {
        if (market_ids.length === 0) {
            return [];
        }

        return await this.prisma.market.findMany({
            where: {
                id: { in: market_ids },
                ...(status !== undefined && { status }),
            },
            select: marketSummarySelect,
            orderBy: { created_at: 'desc' },
        });
    }

    async findOpen(): Promise<MarketSummaryRow[]> {
        return await this.prisma.market.findMany({
            where: { status: MarketStatus.OPEN },
            select: marketSummarySelect,
            orderBy: { name: 'asc' },
        });
    }

    async findExistingByIds(
        marketIds: string[],
    ): Promise<{ id: string; status: MarketStatus }[]> {
        if (marketIds.length === 0) {
            return [];
        }

        return await this.prisma.market.findMany({
            where: { id: { in: marketIds } },
            select: { id: true, status: true },
        });
    }

    async findById(id: string): Promise<MarketWithCurrency | null> {
        return await this.prisma.market.findUnique({
            where: { id },
            include: marketWithCurrency,
        });
    }

    async findOpenByIso2(iso2: string): Promise<MarketSearchMatch | null> {
        return await this.prisma.market.findFirst({
            where: {
                status: MarketStatus.OPEN,
                iso2: {
                    equals: iso2,
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                name: true,
                code: true,
                iso2: true,
                iso3: true,
                status: true,
                currency: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
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
                ...(data.iso2 !== undefined && { iso2: data.iso2 }),
                ...(data.iso3 !== undefined && { iso3: data.iso3 }),
                ...(data.currency_id !== undefined && {
                    currency: { connect: { id: data.currency_id } },
                }),
                ...(data.cash_limit !== undefined && {
                    cash_limit: data.cash_limit,
                }),
            },
            include: marketWithCurrency,
        });
    }

    async findCashLimitById(
        id: string,
    ): Promise<{ cash_limit: Market['cash_limit'] } | null> {
        return await this.prisma.market.findUnique({
            where: { id },
            select: { cash_limit: true },
        });
    }

    async setStatus(
        id: string,
        status: MarketStatus,
    ): Promise<MarketWithCurrency> {
        return await this.prisma.market.update({
            where: { id },
            data: { status },
            include: marketWithCurrency,
        });
    }

    async delete(id: string): Promise<Market> {
        return await this.prisma.market.delete({ where: { id } });
    }

    async countServiceStates(market_id: string): Promise<number> {
        return await this.prisma.serviceState.count({
            where: { market_id },
        });
    }

    async countWarehouses(market_id: string): Promise<number> {
        return await this.prisma.warehouse.count({
            where: { market_id },
        });
    }

    async findStaffContactsByMarketId(
        market_id: string,
    ): Promise<{ id: string; email: string; name: string }[]> {
        return await this.prisma.staff.findMany({
            where: {
                is_active: true,
                staff_scopes: {
                    some: { market_id },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });
    }
}
