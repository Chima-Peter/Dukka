import { Injectable } from '@nestjs/common';
import {
    type Discount,
    type Promotion,
    PromotionMarketScope,
    PromotionMarketStatus,
    PromotionStatus,
    PrismaService,
} from '@app/common';
import type { AddPromotionMarketDto } from './dto/add-promotion-market.dto.js';
import type { CreateDiscountDto } from './dto/create-discount.dto.js';
import type { CreatePromotionDto } from './dto/create-promotion.dto.js';
import type { FindPromotionMarketTargetsDto } from './dto/find-promotion-market-targets.dto.js';
import type { FindPromotionsDto } from './dto/find-promotions.dto.js';
import type { UpdateDiscountDto } from './dto/update-discount.dto.js';
import type { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import type { UpdatePromotionMarketDto } from './dto/update-promotion-market.dto.js';
import {
    TARGET_PAGE_SIZE,
    categoryTargetInclude,
    discountSummarySelect,
    marketSummarySelect,
    productTargetInclude,
    variantTargetInclude,
    type DiscountSummary,
    type PromotionDetail,
    type PromotionMarketDetail,
    type PromotionMarketStatusRecord,
    type PromotionSummary,
    type PromotionTargetPage,
    type PromotionWithDiscount,
} from './types/promotion.type.js';

@Injectable()
export class PromotionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreatePromotionDto): Promise<PromotionWithDiscount> {
        return await this.prisma.promotion.create({
            data: {
                name: data.name,
                description: data.description,
                code: data.code,
                discount: { connect: { id: data.discount_id } },
            },
            include: { discount: true },
        });
    }

    async createDiscount(data: CreateDiscountDto): Promise<Discount> {
        return await this.prisma.discount.create({
            data: {
                type: data.type,
                value: data.value,
                max_discount_amount: data.max_discount_amount,
            },
        });
    }

    async findAllDiscounts(): Promise<DiscountSummary[]> {
        return await this.prisma.discount.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                promotions: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true,
                    },
                    orderBy: { created_at: 'desc' },
                },
            },
        });
    }

    async findAll(query: FindPromotionsDto): Promise<PromotionSummary[]> {
        const records = await this.prisma.promotion.findMany({
            where: {
                ...(query.status !== undefined && { status: query.status }),
                promotion_markets: {
                    some: { market_id: query.market_id },
                },
            },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                name: true,
                code: true,
                status: true,
                created_at: true,
                discount: { select: discountSummarySelect },
                _count: { select: { promotion_markets: true } },
            },
        });

        return records.map((record) => ({
            id: record.id,
            name: record.name,
            code: record.code,
            status: record.status,
            created_at: record.created_at,
            discount: record.discount,
            market_count: record._count.promotion_markets,
        }));
    }

    async findById(id: string): Promise<PromotionDetail | null> {
        return await this.prisma.promotion.findUnique({
            where: { id },
            include: {
                discount: true,
                promotion_markets: {
                    include: {
                        market: { select: marketSummarySelect },
                    },
                    orderBy: { created_at: 'desc' },
                },
            },
        });
    }

    async findDiscountById(id: string): Promise<Discount | null> {
        return await this.prisma.discount.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: UpdatePromotionDto): Promise<Promotion> {
        return await this.prisma.promotion.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.code !== undefined && { code: data.code }),
            },
        });
    }

    async updateDiscount(
        id: string,
        data: UpdateDiscountDto,
    ): Promise<Discount> {
        return await this.prisma.discount.update({
            where: { id },
            data: {
                ...(data.type !== undefined && { type: data.type }),
                ...(data.value !== undefined && { value: data.value }),
                ...(data.max_discount_amount !== undefined && {
                    max_discount_amount: data.max_discount_amount,
                }),
            },
        });
    }

    async updateMarket(
        id: string,
        data: UpdatePromotionMarketDto,
    ): Promise<PromotionMarketDetail> {
        return await this.prisma.promotionMarket.update({
            where: { id },
            data: {
                ...(data.max_total_uses !== undefined && {
                    max_total_uses: data.max_total_uses,
                }),
                ...(data.max_uses_per_customer !== undefined && {
                    max_uses_per_customer: data.max_uses_per_customer,
                }),
                ...(data.start_date !== undefined && {
                    start_date: data.start_date,
                }),
                ...(data.end_date !== undefined && {
                    end_date: data.end_date,
                }),
            },
            include: {
                market: { select: marketSummarySelect },
            },
        });
    }

    async addMarket(
        promotionId: string,
        data: AddPromotionMarketDto,
    ): Promise<PromotionMarketDetail> {
        return await this.prisma.promotionMarket.create({
            data: {
                max_total_uses: data.max_total_uses,
                max_uses_per_customer: data.max_uses_per_customer,
                scope: data.scope,
                start_date: data.start_date,
                end_date: data.end_date,
                promotion: { connect: { id: promotionId } },
                market: { connect: { id: data.market_id } },
                ...(data.scope === PromotionMarketScope.CATEGORY && {
                    promotion_market_categories: {
                        create: data.category_ids!.map((category_id) => ({
                            category: { connect: { id: category_id } },
                        })),
                    },
                }),
                ...(data.scope === PromotionMarketScope.PRODUCT && {
                    promotion_market_products: {
                        create: data.product_ids!.map((product_id) => ({
                            product: { connect: { id: product_id } },
                        })),
                    },
                }),
                ...(data.scope === PromotionMarketScope.VARIANT && {
                    promotion_market_variants: {
                        create: data.variant_ids!.map((variant_id) => ({
                            variant: { connect: { id: variant_id } },
                        })),
                    },
                }),
            },
            include: {
                market: { select: marketSummarySelect },
            },
        });
    }

    async findPromotionStatus(
        id: string,
    ): Promise<{ id: string; status: PromotionStatus } | null> {
        return await this.prisma.promotion.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
    }

    async setPromotionStatus(
        id: string,
        status: PromotionStatus,
    ): Promise<Promotion> {
        return await this.prisma.promotion.update({
            where: { id },
            data: { status },
        });
    }

    async deactivateWithMarkets(id: string): Promise<Promotion> {
        return await this.prisma.$transaction(async (tx) => {
            await tx.promotionMarket.updateMany({
                where: { promotion_id: id },
                data: { status: PromotionMarketStatus.INACTIVE },
            });
            return await tx.promotion.update({
                where: { id },
                data: { status: PromotionStatus.INACTIVE },
            });
        });
    }

    async findPromotionMarket(
        promotionId: string,
        promotionMarketId: string,
    ): Promise<PromotionMarketStatusRecord | null> {
        return await this.prisma.promotionMarket.findFirst({
            where: {
                id: promotionMarketId,
                promotion_id: promotionId,
            },
            select: {
                id: true,
                scope: true,
                status: true,
                market_id: true,
                start_date: true,
                end_date: true,
            },
        });
    }

    async setPromotionMarketStatus(
        id: string,
        status: PromotionMarketStatus,
    ): Promise<PromotionMarketDetail> {
        return await this.prisma.promotionMarket.update({
            where: { id },
            data: { status },
            include: {
                market: { select: marketSummarySelect },
            },
        });
    }

    async findMarketTargets(
        promotionMarketId: string,
        scope: PromotionMarketScope,
        query: FindPromotionMarketTargetsDto,
    ): Promise<PromotionTargetPage> {
        if (scope === PromotionMarketScope.ALL) {
            return { items: [], next_cursor: null };
        }

        let limit = query.limit ?? TARGET_PAGE_SIZE;

        limit = Math.max(limit, TARGET_PAGE_SIZE);

        if (scope === PromotionMarketScope.CATEGORY) {
            const records =
                await this.prisma.promotionMarketCategory.findMany({
                    where: { promotion_market_id: promotionMarketId },
                    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
                    take: limit + 1,
                    ...(query.cursor !== undefined && {
                        cursor: { id: query.cursor },
                        skip: 1,
                    }),
                    include: categoryTargetInclude,
                });
            return this.toTargetPage(records, limit);
        }

        if (scope === PromotionMarketScope.PRODUCT) {
            const records = await this.prisma.promotionMarketProduct.findMany({
                where: { promotion_market_id: promotionMarketId },
                orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
                take: limit + 1,
                ...(query.cursor !== undefined && {
                    cursor: { id: query.cursor },
                    skip: 1,
                }),
                include: productTargetInclude,
            });
            return this.toTargetPage(records, limit);
        }

        const records = await this.prisma.promotionMarketVariant.findMany({
            where: { promotion_market_id: promotionMarketId },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
            include: variantTargetInclude,
        });
        return this.toTargetPage(records, limit);
    }

    private toTargetPage<T extends { id: string }>(
        records: T[],
        limit: number,
    ): PromotionTargetPage {
        const hasMore = records.length > limit;
        const items = hasMore ? records.slice(0, limit) : records;
        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }
}
