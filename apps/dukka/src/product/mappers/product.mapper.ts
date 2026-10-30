import {
    MarketVariantStatus,
    VariantStatus,
    type Prisma,
} from '@app/common';
import type { ProductImageRecord } from '../types/product.type.js';

export function productPromotionMarketSelect(customerId?: string) {
    return {
        id: true,
        start_date: true,
        end_date: true,
        max_total_uses: true,
        max_uses_per_customer: true,
        promotion: {
            select: {
                id: true,
                name: true,
                description: true,
                code: true,
                status: true,
                created_at: true,
                updated_at: true,
                discount: {
                    select: {
                        id: true,
                        type: true,
                        value: true,
                        max_discount_amount: true,
                    },
                },
            },
        },
        _count: {
            select: {
                promotion_usages:
                    customerId === undefined
                        ? true
                        : { where: { customer_id: customerId } },
            },
        },
    } satisfies Prisma.PromotionMarketSelect;
}

export function parsePendingImages(
    images: Prisma.JsonValue | null,
): ProductImageRecord[] | null {
    if (images === null) {
        return null;
    }
    if (!Array.isArray(images)) {
        return [];
    }
    return images.flatMap((image) => {
        if (
            typeof image !== 'object' ||
            image === null ||
            !('image_url' in image) ||
            !('sort_order' in image) ||
            typeof image.image_url !== 'string' ||
            typeof image.sort_order !== 'number'
        ) {
            return [];
        }
        return [
            {
                image_url: image.image_url,
                sort_order: image.sort_order,
            },
        ];
    });
}

export function productListSummarySelect(
    marketId?: string,
    variantStatus?: VariantStatus,
    marketVariantStatus: MarketVariantStatus = MarketVariantStatus.ACTIVE,
    includeStatus = true,
) {
    const hasVariantWhere =
        marketId !== undefined || variantStatus !== undefined;

    return {
        id: true,
        name: true,
        description: true,
        ...(includeStatus && { status: true }),
        category_id: true,
        category: {
            select: {
                name: true,
            },
        },
        created_at: true,
        updated_at: true,
        images: {
            orderBy: { sort_order: 'asc' as const },
            take: 1,
            select: {
                image_url: true,
            },
        },
        variants: {
            ...(hasVariantWhere && {
                where: {
                    ...(variantStatus !== undefined
                        ? { status: variantStatus }
                        : marketId !== undefined
                          ? { status: VariantStatus.ACTIVE }
                          : {}),
                    ...(marketId !== undefined && {
                        market_variants: {
                            some: {
                                status: marketVariantStatus,
                                market: { id: marketId, status: 'OPEN' },
                            },
                        },
                    }),
                },
            }),
            orderBy: [{ created_at: 'asc' as const }, { id: 'asc' as const }],
            take: 1,
            select: {
                status: true,
                market_variants: {
                    where: {
                        status: marketVariantStatus,
                        ...(marketId !== undefined && {
                            market: { id: marketId, status: 'OPEN' },
                        }),
                    },
                    take: 1,
                    select: {
                        price: true,
                        currency: true,
                        sold_out: true,
                    },
                },
            },
        },
    } satisfies Prisma.ProductSelect;
}

export function toProductListItem<
    T extends {
        category: { name: string };
        images: Array<{ image_url: string }>;
        variants: Array<{
            market_variants: Array<{
                price: unknown;
                currency: string;
                sold_out: boolean;
            }>;
        }>;
    },
>(product: T) {
    const { category, images, variants, ...rest } = product;
    const marketVariant = variants[0]?.market_variants[0];
    return {
        ...rest,
        category_name: category.name,
        image_url: images[0]?.image_url ?? null,
        price: marketVariant?.price ?? null,
        currency: marketVariant?.currency ?? null,
        sold_out: marketVariant?.sold_out ?? false,
    };
}

export const productDetailSelect = {
    id: true,
    name: true,
    description: true,
    specs: true,
    status: true,
    category_id: true,
    created_at: true,
    updated_at: true,
    category: {
        select: {
            name: true,
        },
    },
    images: {
        orderBy: { sort_order: 'asc' as const },
        select: {
            id: true,
            image_url: true,
            sort_order: true,
        },
    },
    variants: {
        orderBy: [{ created_at: 'asc' as const }, { id: 'asc' as const }],
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
    },
} satisfies Prisma.ProductSelect;

function marketVariantSelect(marketId: string, activeOnly: boolean) {
    return {
        where: {
            ...(activeOnly && { status: MarketVariantStatus.ACTIVE }),
            market: {
                id: marketId,
                ...(activeOnly && { status: 'OPEN' as const }),
            },
        },
        select: {
            id: true,
            price: true,
            currency: true,
            sold_out: true,
        },
    } as const;
}

export function productDetailWithMarketSelect(marketId: string) {
    return {
        ...productDetailSelect,
        status: false,
        variants: {
            where: {
                status: VariantStatus.ACTIVE,
            },
            orderBy: [{ created_at: 'asc' as const }, { id: 'asc' as const }],
            select: {
                id: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                created_at: true,
                updated_at: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
                market_variants: marketVariantSelect(marketId, true),
            },
        },
    } satisfies Prisma.ProductSelect;
}

export function productStaffDetailWithMarketSelect(marketId: string) {
    return {
        ...productDetailSelect,
        variants: {
            orderBy: [{ created_at: 'asc' as const }, { id: 'asc' as const }],
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
                market_variants: marketVariantSelect(marketId, false),
            },
        },
    } satisfies Prisma.ProductSelect;
}

export function toProductPromotions<
    T extends {
        id: string;
        start_date: Date;
        end_date: Date;
        max_total_uses: number;
        max_uses_per_customer: number;
        _count: { promotion_usages: number };
        promotion: {
            id: string;
            name: string;
            description: string;
            code: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            discount: {
                id: string;
                type: string;
                value: unknown;
                max_discount_amount: unknown;
            };
        };
    },
>(
    promotionMarkets: T[],
    options?: { customerUsage?: boolean },
) {
    return promotionMarkets.map(({ _count, promotion, ...market }) => ({
        promotion_market_id: market.id,
        start_date: market.start_date,
        end_date: market.end_date,
        max_total_uses: market.max_total_uses,
        max_uses_per_customer: market.max_uses_per_customer,
        usage_count: _count.promotion_usages,
        customer_usage_count: options?.customerUsage
            ? _count.promotion_usages
            : 0,
        ...promotion,
    }));
}

export function toProductDetail<
    T extends {
        category: { name: string };
        variants: Array<{
            image: { image_url: string } | null;
            market_variants?: Array<{
                id: string;
                price: unknown;
                currency: string;
                sold_out: boolean;
            }>;
        }>;
    },
>(product: T) {
    const { category, variants, ...rest } = product;
    return {
        ...rest,
        category_name: category.name,
        variants: variants.map(({ image, market_variants, ...variant }) => {
            const marketVariant = market_variants?.[0];
            return {
                ...variant,
                image_url: image?.image_url ?? null,
                ...(market_variants !== undefined && {
                    market_variant_id: marketVariant?.id ?? null,
                    price: marketVariant?.price ?? null,
                    currency: marketVariant?.currency ?? null,
                    sold_out: marketVariant?.sold_out ?? false,
                }),
            };
        }),
    };
}
