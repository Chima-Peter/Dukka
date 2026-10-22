import { Injectable } from '@nestjs/common';
import type { Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindCategoriesDto } from './dto/find-categories.dto.js';
import type { MarketCategoryItem } from './types/market-category.type.js';

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
                market: { connect: { id: marketId } },
                category: { connect: { id: categoryId } },
            },
            include: {
                category: {
                    select: { name: true },
                },
            },
        });

        return {
            id: row.id,
            market_id: row.market_id,
            category_id: row.category_id,
            name: row.category.name,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    async findAllByMarket(query: FindCategoriesDto) {
        const limit = query.limit ?? 50;
        const rows = await this.prisma.marketCategory.findMany({
            where: { market_id: query.market_id },
            include: {
                category: {
                    select: { name: true },
                },
            },
            orderBy: [
                { category: { name: 'asc' } },
                { id: 'asc' },
            ],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;
        const items = page.map((row) => ({
            id: row.id,
            market_id: row.market_id,
            category_id: row.category_id,
            name: row.category.name,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
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
            include: {
                category: {
                    select: { name: true },
                },
            },
        });

        return {
            id: row.id,
            market_id: row.market_id,
            category_id: row.category_id,
            name: row.category.name,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
