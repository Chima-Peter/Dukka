import { Injectable } from '@nestjs/common';
import type { Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type MarketCategoryItem = {
    id: string;
    market_id: string;
    category_id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
};

const marketCategorySelect = {
    id: true,
    market_id: true,
    category_id: true,
    created_at: true,
    updated_at: true,
    category: {
        select: { name: true },
    },
} as const;

function toMarketCategoryItem(row: {
    id: string;
    market_id: string;
    category_id: string;
    created_at: Date;
    updated_at: Date;
    category: { name: string };
}): MarketCategoryItem {
    return {
        id: row.id,
        market_id: row.market_id,
        category_id: row.category_id,
        name: row.category.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

@Injectable()
export class CategoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(name: string): Promise<Category> {
        return await this.prisma.category.create({
            data: { name },
        });
    }

    async update(id: string, name: string): Promise<Category> {
        return await this.prisma.category.update({
            where: { id },
            data: { name },
        });
    }

    async delete(id: string): Promise<Category> {
        return await this.prisma.category.delete({
            where: { id },
        });
    }

    async addToMarket(
        categoryId: string,
        marketId: string,
    ): Promise<MarketCategoryItem> {
        const row = await this.prisma.marketCategory.create({
            data: {
                market_id: marketId,
                category_id: categoryId,
            },
            select: marketCategorySelect,
        });
        return toMarketCategoryItem(row);
    }

    async findAllByMarket(marketId: string): Promise<MarketCategoryItem[]> {
        const rows = await this.prisma.marketCategory.findMany({
            where: { market_id: marketId },
            select: marketCategorySelect,
            orderBy: [
                { category: { name: 'asc' } },
                { id: 'asc' },
            ],
        });

        return rows.map(toMarketCategoryItem);
    }

    async removeFromMarket(
        categoryId: string,
        marketId: string,
    ): Promise<MarketCategoryItem> {
        const row = await this.prisma.marketCategory.delete({
            where: {
                market_id_category_id: {
                    market_id: marketId,
                    category_id: categoryId,
                },
            },
            select: marketCategorySelect,
        });
        return toMarketCategoryItem(row);
    }
}
