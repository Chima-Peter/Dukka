import {
    Prisma,
    PromotionMarketStatus,
    PromotionStatus,
} from '@app/common';
import { computeDiscountAmount } from '../../promotions/utils/compute-discount-amount.js';
import type { CartItemView, CartView } from '../types/cart.type.js';

export const cartItemSelect = {
    id: true,
    quantity: true,
    market_variant_id: true,
    promotion_market_id: true,
    created_at: true,
    updated_at: true,
    market_variant: {
        select: {
            price: true,
            currency: true,
            sold_out: true,
            market_id: true,
            variant: {
                select: {
                    color: true,
                    size: true,
                    variant_info: true,
                    image: {
                        select: { image_url: true },
                    },
                    product: {
                        select: {
                            name: true,
                            specs: true,
                            images: {
                                select: { image_url: true },
                                orderBy: { sort_order: 'asc' },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    },
    promotion_market: {
        select: {
            status: true,
            start_date: true,
            end_date: true,
            promotion: {
                select: {
                    status: true,
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
} satisfies Prisma.CartItemsSelect;

export const cartSelect = {
    id: true,
    total: true,
    customer_id: true,
    created_at: true,
    updated_at: true,
    items: {
        select: cartItemSelect,
        orderBy: { created_at: 'asc' },
    },
} satisfies Prisma.CartSelect;

type CartRow = Prisma.CartGetPayload<{ select: typeof cartSelect }>;
type CartItemRow = Prisma.CartItemsGetPayload<{
    select: typeof cartItemSelect;
}>;

export type CartMapOptions = {
    endDateGraceMs?: number;
};

function toActiveDiscount(
    row: CartItemRow,
    options?: CartMapOptions,
): CartItemView['discount'] {
    const promotionMarket = row.promotion_market;
    if (promotionMarket === null) {
        return null;
    }

    const now = new Date();
    const graceMs = options?.endDateGraceMs ?? 0;
    const expiredBefore = new Date(now.getTime() - graceMs);
    if (
        promotionMarket.status !== PromotionMarketStatus.ACTIVE ||
        promotionMarket.promotion.status !== PromotionStatus.ACTIVE ||
        promotionMarket.start_date > now ||
        promotionMarket.end_date < expiredBefore
    ) {
        return null;
    }

    return {
        type: promotionMarket.promotion.discount.type,
        value: promotionMarket.promotion.discount.value,
        max_discount_amount:
            promotionMarket.promotion.discount.max_discount_amount,
    };
}

function toProductSpecs(row: CartItemRow): Record<string, unknown> {
    const { variant } = row.market_variant;
    const productSpecs =
        typeof variant.product.specs === 'object' &&
        variant.product.specs !== null &&
        !Array.isArray(variant.product.specs)
            ? (variant.product.specs as Record<string, unknown>)
            : {};
    const variantInfo =
        typeof variant.variant_info === 'object' &&
        variant.variant_info !== null &&
        !Array.isArray(variant.variant_info)
            ? (variant.variant_info as Record<string, unknown>)
            : {};

    return {
        ...productSpecs,
        ...(variant.color !== null && { color: variant.color }),
        ...(variant.size !== null && { size: variant.size }),
        ...variantInfo,
    };
}

export function toCartItemView(
    row: CartItemRow,
    options?: CartMapOptions,
): CartItemView {
    const discount = toActiveDiscount(row, options);
    const discount_amount =
        discount === null
            ? new Prisma.Decimal(0)
            : computeDiscountAmount(
                  discount.type,
                  discount.value,
                  discount.max_discount_amount,
                  row.market_variant.price,
              );
    const { variant } = row.market_variant;

    return {
        id: row.id,
        quantity: row.quantity,
        market_variant_id: row.market_variant_id,
        promotion_market_id: row.promotion_market_id,
        price: row.market_variant.price,
        discount,
        discount_amount,
        currency: row.market_variant.currency,
        sold_out: row.market_variant.sold_out,
        promotion_warning: null,
        product_name: variant.product.name,
        product_image:
            variant.image?.image_url ??
            variant.product.images[0]?.image_url ??
            '',
        product_specs: toProductSpecs(row),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toCartView(
    row: CartRow,
    options?: CartMapOptions,
): CartView {
    return {
        id: row.id,
        total: row.total,
        customer_id: row.customer_id,
        market_id: row.items[0]?.market_variant.market_id ?? null,
        items: row.items.map((item) => toCartItemView(item, options)),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
