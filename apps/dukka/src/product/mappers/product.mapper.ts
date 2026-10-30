import {
    DiscountType,
    MarketVariantStatus,
    PromotionMarketStatus,
    PromotionStatus,
    VariantStatus,
    type Prisma,
} from '@app/common';
import { computeDiscountAmount } from '../../promotions/utils/compute-discount-amount.js';
import type { ProductImageRecord } from '../types/product.type.js';

type NestedValidPromotion = {
    promotion_market: {
        id: string;
        promotion: {
            discount: {
                type: DiscountType;
                value: unknown;
                max_discount_amount: unknown;
            };
        };
    };
};

function validPromotionMarketVariantSelect() {
    const now = new Date();
    return {
        where: {
            promotion_market: {
                status: PromotionMarketStatus.ACTIVE,
                start_date: { lte: now },
                end_date: { gte: now },
                promotion: { status: PromotionStatus.ACTIVE },
            },
        },
        take: 1,
        select: {
            promotion_market: {
                select: {
                    id: true,
                    promotion: {
                        select: {
                            discount: {
                                select: {
                                    type: true,
                                    value: true,
                                    max_discount_amount: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    } satisfies Prisma.PromotionMarketVariantFindManyArgs;
}

function toVariantPromotion(
    price: unknown | null | undefined,
    promotionMarketVariants: NestedValidPromotion[] | undefined,
): { promotion_market_id: string; amount: Prisma.Decimal } | null {
    const promotionMarket = promotionMarketVariants?.[0]?.promotion_market;
    if (
        promotionMarket === undefined ||
        price === null ||
        price === undefined
    ) {
        return null;
    }

    const amount = computeDiscountAmount(
        promotionMarket.promotion.discount.type,
        promotionMarket.promotion.discount.value as
            | Prisma.Decimal
            | number
            | string,
        promotionMarket.promotion.discount.max_discount_amount as
            | Prisma.Decimal
            | number
            | string,
        price as Prisma.Decimal | number | string,
    );

    if (amount.lte(0)) {
        return null;
    }

    return {
        promotion_market_id: promotionMarket.id,
        amount,
    };
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
                        id: true,
                        price: true,
                        currency: true,
                        sold_out: true,
                        promotion_market_variants:
                            validPromotionMarketVariantSelect(),
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
                id: string;
                price: unknown;
                currency: string;
                sold_out: boolean;
                promotion_market_variants?: NestedValidPromotion[];
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
        market_variant_id: marketVariant?.id ?? null,
        price: marketVariant?.price ?? null,
        currency: marketVariant?.currency ?? null,
        sold_out: marketVariant?.sold_out ?? false,
        promotion: toVariantPromotion(
            marketVariant?.price,
            marketVariant?.promotion_market_variants,
        ),
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

type NestedStaffPromotion = {
    promotion_market: {
        id: string;
        status: PromotionMarketStatus;
        start_date: Date;
        end_date: Date;
    };
};

function staffPromotionMarketVariantSelect() {
    return {
        orderBy: [{ created_at: 'desc' as const }],
        select: {
            promotion_market: {
                select: {
                    id: true,
                    status: true,
                    start_date: true,
                    end_date: true,
                },
            },
        },
    } satisfies Prisma.PromotionMarketVariantFindManyArgs;
}

function toVariantPromotions(
    promotionMarketVariants: NestedStaffPromotion[] | undefined,
) {
    return (promotionMarketVariants ?? []).map(({ promotion_market }) => ({
        promotion_market_id: promotion_market.id,
        status: promotion_market.status,
        start_date: promotion_market.start_date,
        end_date: promotion_market.end_date,
    }));
}

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
            promotion_market_variants: validPromotionMarketVariantSelect(),
        },
    } satisfies Prisma.MarketVariantFindManyArgs;
}

function staffMarketVariantSelect(marketId: string) {
    return {
        where: {
            market: { id: marketId },
        },
        select: {
            id: true,
            price: true,
            currency: true,
            sold_out: true,
            promotion_market_variants: staffPromotionMarketVariantSelect(),
        },
    } satisfies Prisma.MarketVariantFindManyArgs;
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
                market_variants: staffMarketVariantSelect(marketId),
            },
        },
    } satisfies Prisma.ProductSelect;
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
                promotion_market_variants?: NestedValidPromotion[];
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
                    promotion: toVariantPromotion(
                        marketVariant?.price,
                        marketVariant?.promotion_market_variants,
                    ),
                }),
            };
        }),
    };
}

export function toStaffProductDetail<
    T extends {
        category: { name: string };
        variants: Array<{
            image: { image_url: string } | null;
            market_variants?: Array<{
                id: string;
                price: unknown;
                currency: string;
                sold_out: boolean;
                promotion_market_variants?: NestedStaffPromotion[];
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
                    promotions: toVariantPromotions(
                        marketVariant?.promotion_market_variants,
                    ),
                }),
            };
        }),
    };
}
