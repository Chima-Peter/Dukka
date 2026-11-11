import {
    DiscountType,
    MarketVariantStatus,
    ProductPendingUpdateStatus,
    ProductStatus,
    PromotionMarketStatus,
    PromotionStatus,
    VariantPendingUpdateStatus,
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
        ...(includeStatus && { status: true }),
        category: {
            select: {
                name: true,
            },
        },
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
                        promotion_market_variants:
                            validPromotionMarketVariantSelect(),
                    },
                },
            },
        },
    } satisfies Prisma.ProductSelect;
}

export type PublicProductListItem = {
    id: string;
    name: string;
    image_url: string | null;
    price: unknown | null;
    currency: string | null;
    sold_out: boolean;
    promotion: { promotion_market_id: string; amount: Prisma.Decimal } | null;
};

export type StaffProductListItem = {
    id: string;
    name: string;
    status: ProductStatus;
    image_url: string | null;
    category_name: string;
    price: unknown | null;
    currency: string | null;
};

export function toProductListItem<
    T extends {
        id: string;
        name: string;
        status?: ProductStatus;
        category: { name: string };
        images: Array<{ image_url: string }>;
        variants: Array<{
            market_variants: Array<{
                price: unknown;
                currency: string;
                sold_out: boolean;
                promotion_market_variants?: NestedValidPromotion[];
            }>;
        }>;
    },
>(product: T): PublicProductListItem | StaffProductListItem {
    const marketVariant = product.variants[0]?.market_variants[0];
    const image_url = product.images[0]?.image_url ?? null;
    const price = marketVariant?.price ?? null;
    const currency = marketVariant?.currency ?? null;

    if (product.status !== undefined) {
        return {
            id: product.id,
            name: product.name,
            status: product.status,
            image_url,
            category_name: product.category.name,
            price,
            currency,
        };
    }

    return {
        id: product.id,
        name: product.name,
        image_url,
        price,
        currency,
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

export const marketVariantMutationSelect = {
    id: true,
    price: true,
    currency: true,
    sold_out: true,
    status: true,
    market_id: true,
    variant_id: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.MarketVariantSelect;

export type MarketVariantView = {
    id: string;
    price: Prisma.Decimal;
    currency: string;
    sold_out: boolean;
    status: MarketVariantStatus;
    market_id: string;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
};

type MarketVariantMutationRow = Prisma.MarketVariantGetPayload<{
    select: typeof marketVariantMutationSelect;
}>;

export type ProductStatusView = {
    id: string;
    name: string;
    status: ProductStatus;
    category_id: string;
    updated_at: Date;
};

export type MarketVariantDetailView = MarketVariantView & {
    promotions: Array<{
        promotion_market_id: string;
        status: PromotionMarketStatus;
        start_date: Date;
        end_date: Date;
    }>;
    variant_code: string;
    color: string | null;
    size: string | null;
    variant_status: VariantStatus;
    image_url: string | null;
    product_id: string;
    product_name: string;
    product_status: ProductStatus;
};

type MarketVariantDetailRow = {
    id: string;
    price: Prisma.Decimal;
    currency: string;
    sold_out: boolean;
    status: MarketVariantStatus;
    market_id: string;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
    promotion_market_variants: NestedStaffPromotion[];
    variant: {
        id: string;
        variant_code: string;
        color: string | null;
        size: string | null;
        status: VariantStatus;
        product_id: string;
        image: { image_url: string } | null;
        product: {
            id: string;
            name: string;
            status: ProductStatus;
        };
    };
};

export function toMarketVariantView(
    row: MarketVariantMutationRow,
): MarketVariantView {
    return {
        id: row.id,
        price: row.price,
        currency: row.currency,
        sold_out: row.sold_out,
        status: row.status,
        market_id: row.market_id,
        variant_id: row.variant_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toMarketVariantDetailView(
    row: MarketVariantDetailRow,
): MarketVariantDetailView {
    return {
        ...toMarketVariantView(row),
        promotions: toVariantPromotions(row.promotion_market_variants),
        variant_code: row.variant.variant_code,
        color: row.variant.color,
        size: row.variant.size,
        variant_status: row.variant.status,
        image_url: row.variant.image?.image_url ?? null,
        product_id: row.variant.product.id,
        product_name: row.variant.product.name,
        product_status: row.variant.product.status,
    };
}

export function toProductStatusView(product: {
    id: string;
    name: string;
    status: ProductStatus;
    category_id: string;
    updated_at: Date;
}): ProductStatusView {
    return {
        id: product.id,
        name: product.name,
        status: product.status,
        category_id: product.category_id,
        updated_at: product.updated_at,
    };
}

export type ProductPendingUpdateSummary = {
    id: string;
    status: ProductPendingUpdateStatus;
    product_id: string;
    product_name: string;
    created_at: Date;
    updated_at: Date;
};

export type ProductPendingUpdatePage = {
    items: ProductPendingUpdateSummary[];
    next_cursor: string | null;
};

export type ProductPendingUpdateMutationView = {
    id: string;
    status: ProductPendingUpdateStatus;
    name: string | null;
    description: string | null;
    specs: Prisma.JsonValue | null;
    category_id: string | null;
    images: ProductImageRecord[] | null;
    product_id: string;
    created_at: Date;
    updated_at: Date;
};

export type ProductPendingUpdateDetailView = ProductPendingUpdateMutationView & {
    current: {
        name: string;
        description: string;
        specs: Prisma.JsonValue | null;
        status: ProductStatus;
        category_id: string;
        images: Array<{ image_url: string; sort_order: number }>;
    };
};

export type ProductPendingUpdateCreatedView = {
    id: string;
    status: ProductPendingUpdateStatus;
    product_id: string;
    created_at: Date;
    updated_at: Date;
};

export type VariantPendingUpdateSummary = {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_id: string;
    variant_code: string;
    product_id: string;
    product_name: string;
    created_at: Date;
    updated_at: Date;
};

export type VariantPendingUpdatePage = {
    items: VariantPendingUpdateSummary[];
    next_cursor: string | null;
};

export type VariantPendingUpdateMutationView = {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_code: string | null;
    color: string | null;
    size: string | null;
    variant_info: Prisma.JsonValue | null;
    image_url: string | null;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
};

export type VariantPendingUpdateDetailView =
    VariantPendingUpdateMutationView & {
        product_id: string;
        product_name: string;
        current: {
            variant_code: string;
            color: string | null;
            size: string | null;
            variant_info: Prisma.JsonValue | null;
            status: VariantStatus;
            image_url: string | null;
        };
    };

export type VariantPendingUpdateCreatedView = {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
};

export function toProductPendingUpdateSummary(row: {
    id: string;
    status: ProductPendingUpdateStatus;
    product_id: string;
    created_at: Date;
    updated_at: Date;
    product: { name: string };
}): ProductPendingUpdateSummary {
    return {
        id: row.id,
        status: row.status,
        product_id: row.product_id,
        product_name: row.product.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toProductPendingUpdateCreatedView(row: {
    id: string;
    status: ProductPendingUpdateStatus;
    product_id: string;
    created_at: Date;
    updated_at: Date;
}): ProductPendingUpdateCreatedView {
    return {
        id: row.id,
        status: row.status,
        product_id: row.product_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toProductPendingUpdateMutationView(row: {
    id: string;
    status: ProductPendingUpdateStatus;
    name: string | null;
    description: string | null;
    specs: Prisma.JsonValue | null;
    category_id: string | null;
    images: Prisma.JsonValue | null;
    product_id: string;
    created_at: Date;
    updated_at: Date;
}): ProductPendingUpdateMutationView {
    return {
        id: row.id,
        status: row.status,
        name: row.name,
        description: row.description,
        specs: row.specs,
        category_id: row.category_id,
        images: parsePendingImages(row.images),
        product_id: row.product_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toProductPendingUpdateDetailView(row: {
    id: string;
    status: ProductPendingUpdateStatus;
    name: string | null;
    description: string | null;
    specs: Prisma.JsonValue | null;
    category_id: string | null;
    images: Prisma.JsonValue | null;
    product_id: string;
    created_at: Date;
    updated_at: Date;
    product: {
        name: string;
        description: string;
        specs: Prisma.JsonValue | null;
        status: ProductStatus;
        category_id: string;
        images: Array<{ image_url: string; sort_order: number }>;
    };
}): ProductPendingUpdateDetailView {
    return {
        ...toProductPendingUpdateMutationView(row),
        current: {
            name: row.product.name,
            description: row.product.description,
            specs: row.product.specs,
            status: row.product.status,
            category_id: row.product.category_id,
            images: row.product.images,
        },
    };
}

export function toVariantPendingUpdateSummary(row: {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
    variant: {
        variant_code: string;
        product_id: string;
        product: { name: string };
    };
}): VariantPendingUpdateSummary {
    return {
        id: row.id,
        status: row.status,
        variant_id: row.variant_id,
        variant_code: row.variant.variant_code,
        product_id: row.variant.product_id,
        product_name: row.variant.product.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toVariantPendingUpdateCreatedView(row: {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
}): VariantPendingUpdateCreatedView {
    return {
        id: row.id,
        status: row.status,
        variant_id: row.variant_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toVariantPendingUpdateMutationView(row: {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_code: string | null;
    color: string | null;
    size: string | null;
    variant_info: Prisma.JsonValue | null;
    image_url: string | null;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
}): VariantPendingUpdateMutationView {
    return {
        id: row.id,
        status: row.status,
        variant_code: row.variant_code,
        color: row.color,
        size: row.size,
        variant_info: row.variant_info,
        image_url: row.image_url,
        variant_id: row.variant_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toVariantPendingUpdateDetailView(row: {
    id: string;
    status: VariantPendingUpdateStatus;
    variant_code: string | null;
    color: string | null;
    size: string | null;
    variant_info: Prisma.JsonValue | null;
    image_url: string | null;
    variant_id: string;
    created_at: Date;
    updated_at: Date;
    variant: {
        variant_code: string;
        color: string | null;
        size: string | null;
        variant_info: Prisma.JsonValue | null;
        status: VariantStatus;
        image: { image_url: string } | null;
        product: {
            id: string;
            name: string;
        };
    };
}): VariantPendingUpdateDetailView {
    return {
        ...toVariantPendingUpdateMutationView(row),
        product_id: row.variant.product.id,
        product_name: row.variant.product.name,
        current: {
            variant_code: row.variant.variant_code,
            color: row.variant.color,
            size: row.variant.size,
            variant_info: row.variant.variant_info,
            status: row.variant.status,
            image_url: row.variant.image?.image_url ?? null,
        },
    };
}
