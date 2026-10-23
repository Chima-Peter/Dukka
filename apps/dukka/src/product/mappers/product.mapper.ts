import {
    VariantStatus,
    type Prisma,
} from '../../../generated/prisma/client.js';

export function productListSummarySelect(
    marketId?: string,
    variantStatus?: VariantStatus,
) {
    const hasVariantWhere =
        marketId !== undefined || variantStatus !== undefined;

    return {
        id: true,
        name: true,
        description: true,
        status: true,
        market_category_id: true,
        market_category: {
            select: {
                category: {
                    select: {
                        name: true,
                    },
                },
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
                    ...(marketId !== undefined && {
                        where: {
                            market: { id: marketId, status: 'OPEN' },
                        },
                    }),
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
        market_category: { category: { name: string } };
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
    const { market_category, images, variants, ...rest } = product;
    const marketVariant = variants[0]?.market_variants[0];
    return {
        ...rest,
        category_name: market_category.category.name,
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
    market_category_id: true,
    created_at: true,
    updated_at: true,
    market_category: {
        select: {
            category: {
                select: {
                    name: true,
                },
            },
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

export function productDetailWithMarketSelect(marketId?: string) {
    return {
        ...productDetailSelect,
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
                status: true,
                created_at: true,
                updated_at: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
                market_variants: {
                    ...(marketId !== undefined && {
                        where: {
                            market: { id: marketId, status: 'OPEN' },
                        },
                    }),
                    select: {
                        id: true,
                        price: true,
                        currency: true,
                        sold_out: true,
                    },
                },
            },
        },
    } satisfies Prisma.ProductSelect;
}

export function toProductDetail<
    T extends {
        market_category: { category: { name: string } };
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
    const { market_category, variants, ...rest } = product;
    return {
        ...rest,
        category_name: market_category.category.name,
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
