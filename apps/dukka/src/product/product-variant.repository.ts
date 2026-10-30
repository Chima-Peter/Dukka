import { Injectable, NotFoundException } from '@nestjs/common';
import {
    MarketVariantStatus,
    Prisma,
    ProductStatus,
    VariantPendingUpdateStatus,
    VariantStatus,
    PrismaService,
} from '@app/common';
import type { FindMarketVariantsDto } from './dto/find-market-variants.dto.js';
import type { FindVariantPendingUpdatesDto } from './dto/find-variant-pending-updates.dto.js';
import type { UpdateVariantDto } from './dto/update-variant.dto.js';

@Injectable()
export class ProductVariantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findMarketVariants(
        query: FindMarketVariantsDto,
        marketIds: string[],
    ) {
        if (marketIds.length === 0) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 50;
        const records = await this.prisma.marketVariant.findMany({
            where: {
                market_id: { in: marketIds },
                status:
                    query.market_variant_status ?? MarketVariantStatus.ACTIVE,
                ...(query.product_id !== undefined && {
                    variant: { product_id: query.product_id },
                }),
            },
            select: {
                id: true,
                variant: {
                    select: {
                        variant_code: true,
                        image: { select: { image_url: true } },
                        product: {
                            select: {
                                name: true,
                                images: {
                                    where: { sort_order: 0 },
                                    take: 1,
                                    select: { image_url: true },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map((row) => ({
            id: row.id,
            product_name: row.variant.product.name,
            sku: row.variant.variant_code,
            image_url:
                row.variant.image?.image_url ??
                row.variant.product.images[0]?.image_url ??
                null,
        }));

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }

    async createVariant(
        productId: string,
        data: {
            variant_code: string;
            color?: string;
            size?: string;
            variant_info: Record<string, unknown>;
            image_url?: string;
        },
    ) {
        return await this.prisma.variant.create({
            data: {
                product: { connect: { id: productId } },
                variant_code: data.variant_code,
                color: data.color,
                size: data.size,
                variant_info: data.variant_info as Prisma.InputJsonValue,
                ...(data.image_url !== undefined && {
                    image: {
                        create: { image_url: data.image_url },
                    },
                }),
            },
            select: {
                id: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                status: true,
                created_at: true,
                updated_at: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
            },
        });
    }

    async updateVariant(
        productId: string,
        variantId: string,
        data: UpdateVariantDto & { image_url?: string },
    ) {
        const updateData: Prisma.VariantUpdateInput = {
            ...(data.variant_code !== undefined && {
                variant_code: data.variant_code,
            }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.size !== undefined && { size: data.size }),
            ...(data.variant_info !== undefined && {
                variant_info: data.variant_info as Prisma.InputJsonValue,
            }),
            ...(data.image_url !== undefined && {
                image: {
                    upsert: {
                        create: { image_url: data.image_url },
                        update: { image_url: data.image_url },
                    },
                },
            }),
        };

        return await this.prisma.variant.update({
            where: {
                id: variantId,
                product_id: productId,
            },
            data: updateData,
            select: {
                id: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                status: true,
                created_at: true,
                updated_at: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
            },
        });
    }

    async findPendingUpdateForVariant(variantId: string) {
        return await this.prisma.variantPendingUpdate.findFirst({
            where: {
                variant_id: variantId,
                status: VariantPendingUpdateStatus.PENDING,
            },
            select: { id: true },
        });
    }

    async createPendingUpdate(
        variantId: string,
        data: {
            variant_code?: string;
            color?: string;
            size?: string;
            variant_info?: Record<string, unknown>;
            image_url?: string;
        },
    ) {
        return await this.prisma.variantPendingUpdate.create({
            data: {
                variant: { connect: { id: variantId } },
                ...(data.variant_code !== undefined && {
                    variant_code: data.variant_code,
                }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.size !== undefined && { size: data.size }),
                ...(data.variant_info !== undefined && {
                    variant_info: data.variant_info as Prisma.InputJsonValue,
                }),
                ...(data.image_url !== undefined && {
                    image_url: data.image_url,
                }),
            },
            select: {
                id: true,
                status: true,
                variant_id: true,
                created_at: true,
                updated_at: true,
            },
        });
    }

    async findPendingUpdatesByIds(pendingUpdateIds: string[]) {
        return await this.prisma.variantPendingUpdate.findMany({
            where: {
                id: { in: pendingUpdateIds },
            },
            select: {
                id: true,
                status: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                image_url: true,
                variant_id: true,
                variant: {
                    select: {
                        id: true,
                        image: {
                            select: { image_url: true },
                        },
                    },
                },
            },
        });
    }

    async approvePendingUpdates(
        pendingUpdates: Array<{
            id: string;
            variant_id: string;
            variant_code: string | null;
            color: string | null;
            size: string | null;
            variant_info: Prisma.JsonValue | null;
            image_url: string | null;
        }>,
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            for (const update of pendingUpdates) {
                const updateData: Prisma.VariantUpdateInput = {
                    ...(update.variant_code !== null && {
                        variant_code: update.variant_code,
                    }),
                    ...(update.color !== null && { color: update.color }),
                    ...(update.size !== null && { size: update.size }),
                    ...(update.variant_info !== null && {
                        variant_info:
                            update.variant_info as Prisma.InputJsonValue,
                    }),
                    ...(update.image_url !== null && {
                        image: {
                            upsert: {
                                create: { image_url: update.image_url },
                                update: { image_url: update.image_url },
                            },
                        },
                    }),
                };

                await tx.variant.update({
                    where: { id: update.variant_id },
                    data: updateData,
                });

                await tx.variantPendingUpdate.update({
                    where: { id: update.id },
                    data: { status: VariantPendingUpdateStatus.APPROVED },
                });
            }
        });
    }

    async rejectPendingUpdates(pendingUpdateIds: string[]): Promise<void> {
        await this.prisma.variantPendingUpdate.updateMany({
            where: {
                id: { in: pendingUpdateIds },
                status: VariantPendingUpdateStatus.PENDING,
            },
            data: { status: VariantPendingUpdateStatus.REJECTED },
        });
    }

    async updatePendingUpdate(
        id: string,
        data: {
            variant_code?: string;
            color?: string;
            size?: string;
            variant_info?: Record<string, unknown>;
            image_url?: string;
        },
    ) {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.variantPendingUpdate.findUnique({
                where: { id },
                select: {
                    id: true,
                    status: true,
                    image_url: true,
                    variant_id: true,
                },
            });
            if (!existing) {
                return { error: 'NOT_FOUND' as const };
            }
            if (
                existing.status !== VariantPendingUpdateStatus.PENDING &&
                existing.status !== VariantPendingUpdateStatus.REJECTED
            ) {
                return { error: 'INVALID_STATUS' as const };
            }

            if (existing.status === VariantPendingUpdateStatus.REJECTED) {
                const otherPending = await tx.variantPendingUpdate.findFirst({
                    where: {
                        variant_id: existing.variant_id,
                        status: VariantPendingUpdateStatus.PENDING,
                        id: { not: id },
                    },
                    select: { id: true },
                });
                if (otherPending) {
                    return { error: 'CONFLICT' as const };
                }
            }

            const previousImageUrl = existing.image_url;
            const pendingUpdate = await tx.variantPendingUpdate.update({
                where: { id },
                data: {
                    ...(data.variant_code !== undefined && {
                        variant_code: data.variant_code,
                    }),
                    ...(data.color !== undefined && { color: data.color }),
                    ...(data.size !== undefined && { size: data.size }),
                    ...(data.variant_info !== undefined && {
                        variant_info:
                            data.variant_info as Prisma.InputJsonValue,
                    }),
                    ...(data.image_url !== undefined && {
                        image_url: data.image_url,
                    }),
                    status: VariantPendingUpdateStatus.PENDING,
                },
                select: {
                    id: true,
                    status: true,
                    variant_code: true,
                    color: true,
                    size: true,
                    variant_info: true,
                    image_url: true,
                    variant_id: true,
                    created_at: true,
                    updated_at: true,
                },
            });

            return { previousImageUrl, pendingUpdate };
        });
    }

    async findPendingUpdateById(id: string) {
        const record = await this.prisma.variantPendingUpdate.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                image_url: true,
                variant_id: true,
                created_at: true,
                updated_at: true,
                variant: {
                    select: {
                        id: true,
                        variant_code: true,
                        color: true,
                        size: true,
                        variant_info: true,
                        status: true,
                        product_id: true,
                        image: {
                            select: { image_url: true },
                        },
                        product: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!record) {
            return null;
        }

        const { variant, ...pending } = record;
        const { image, product, ...currentVariant } = variant;

        return {
            ...pending,
            current_variant: {
                ...currentVariant,
                image_url: image?.image_url ?? null,
            },
            product_id: product.id,
            product_name: product.name,
        };
    }

    async findPendingUpdatesSummary(query: FindVariantPendingUpdatesDto) {
        const limit = query.limit ?? 50;
        const records = await this.prisma.variantPendingUpdate.findMany({
            where: {
                ...(query.status !== undefined && { status: query.status }),
                ...((query.from_date !== undefined ||
                    query.to_date !== undefined) && {
                    created_at: {
                        ...(query.from_date !== undefined && {
                            gte: new Date(query.from_date),
                        }),
                        ...(query.to_date !== undefined && {
                            lte: new Date(query.to_date),
                        }),
                    },
                }),
            },
            select: {
                id: true,
                status: true,
                created_at: true,
                updated_at: true,
                variant_id: true,
                variant: {
                    select: {
                        variant_code: true,
                        product_id: true,
                        product: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map(
            ({ variant, ...rest }) => ({
                ...rest,
                variant_code: variant.variant_code,
                product_id: variant.product_id,
                product_name: variant.product.name,
            }),
        );

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findVariantInProduct(productId: string, variantId: string) {
        return await this.prisma.variant.findFirst({
            where: {
                id: variantId,
                product_id: productId,
            },
            select: {
                id: true,
                status: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
            },
        });
    }

    async findVariantsInProduct(productId: string, variantIds: string[]) {
        return await this.prisma.variant.findMany({
            where: {
                product_id: productId,
                id: { in: variantIds },
            },
            select: {
                id: true,
                status: true,
            },
        });
    }

    async updateVariantsStatus(
        productId: string,
        variantIds: string[],
        status: VariantStatus,
    ): Promise<void> {
        await this.prisma.variant.updateMany({
            where: {
                product_id: productId,
                id: { in: variantIds },
            },
            data: { status },
        });
    }

    async archiveVariants(
        productId: string,
        variantIds: string[],
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.marketVariant.updateMany({
                where: {
                    variant_id: { in: variantIds },
                    status: { not: MarketVariantStatus.CLOSED },
                },
                data: { status: MarketVariantStatus.CLOSED },
            });
            await tx.variant.updateMany({
                where: {
                    product_id: productId,
                    id: { in: variantIds },
                },
                data: { status: VariantStatus.ARCHIVED },
            });
        });
    }

    async findVariantById(variantId: string) {
        return await this.prisma.variant.findUnique({
            where: { id: variantId },
            select: {
                id: true,
                product_id: true,
                status: true,
            },
        });
    }

    async findVariantByIdOrThrow(variantId: string) {
        const variant = await this.findVariantById(variantId);
        if (!variant) {
            throw new NotFoundException('Variant not found');
        }
        return variant;
    }

    async findMarketVariantById(marketVariantId: string) {
        return await this.prisma.marketVariant.findFirst({
            where: {
                id: marketVariantId,
                status: MarketVariantStatus.ACTIVE,
            },
            select: {
                id: true,
                market_id: true,
                variant_id: true,
                variant: {
                    select: {
                        id: true,
                        product_id: true,
                    },
                },
            },
        });
    }

    async findMarketVariantByIdOrThrow(marketVariantId: string) {
        const marketVariant = await this.findMarketVariantById(marketVariantId);
        if (!marketVariant) {
            throw new NotFoundException('Market variant not found');
        }
        return marketVariant;
    }

    async findMarketVariantsByIds(marketVariantIds: string[]) {
        if (marketVariantIds.length === 0) {
            return [];
        }

        return await this.prisma.marketVariant.findMany({
            where: {
                id: { in: marketVariantIds },
                status: MarketVariantStatus.ACTIVE,
            },
            select: {
                id: true,
                market_id: true,
                variant_id: true,
                variant: {
                    select: {
                        id: true,
                        product_id: true,
                    },
                },
            },
        });
    }

    async createMarketVariant(data: {
        variant_id: string;
        market_id: string;
        price: number;
        currency: string;
    }) {
        return await this.prisma.marketVariant.create({
            data: {
                variant: {
                    connect: { id: data.variant_id },
                },
                market: {
                    connect: { id: data.market_id },
                },
                price: data.price,
                currency: data.currency,
                status: MarketVariantStatus.ACTIVE,
            },
        });
    }

    async reopenMarketVariant(data: {
        variant_id: string;
        market_id: string;
        price: number;
        currency: string;
    }) {
        const updated = await this.prisma.marketVariant.updateManyAndReturn({
            where: {
                market_id: data.market_id,
                variant_id: data.variant_id,
                status: MarketVariantStatus.CLOSED,
            },
            data: {
                price: data.price,
                currency: data.currency,
                status: MarketVariantStatus.ACTIVE,
            },
        });
        return updated[0] ?? null;
    }

    async updateMarketVariant(
        variantId: string,
        marketId: string,
        price: number,
    ) {
        return await this.prisma.marketVariant.update({
            where: {
                market_id_variant_id: {
                    market_id: marketId,
                    variant_id: variantId,
                },
            },
            data: { price },
        });
    }

    async closeMarketVariant(variantId: string, marketId: string) {
        const updated = await this.prisma.marketVariant.updateManyAndReturn({
            where: {
                market_id: marketId,
                variant_id: variantId,
                status: MarketVariantStatus.ACTIVE,
            },
            data: { status: MarketVariantStatus.CLOSED },
        });
        if (updated.length === 0) {
            throw new NotFoundException('Market variant not found');
        }
        return updated[0];
    }

    async findMarketVariant(
        productId: string,
        variantId: string,
        marketId: string,
        status?: ProductStatus,
    ) {
        return await this.prisma.marketVariant.findFirst({
            where: {
                status: MarketVariantStatus.ACTIVE,
                market: { id: marketId, status: 'OPEN' },
                variant_id: variantId,
                variant: {
                    product_id: productId,
                    status: VariantStatus.ACTIVE,
                    ...(status !== undefined && {
                        product: { status },
                    }),
                },
            },
        });
    }
}
