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

function toActiveDiscount(row: CartItemRow): CartItemView['discount'] {
    const promotionMarket = row.promotion_market;
    if (promotionMarket === null) {
        return null;
    }

    const now = new Date();
    if (
        promotionMarket.status !== PromotionMarketStatus.ACTIVE ||
        promotionMarket.promotion.status !== PromotionStatus.ACTIVE ||
        promotionMarket.start_date > now ||
        promotionMarket.end_date < now
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

export function toCartItemView(row: CartItemRow): CartItemView {
    const discount = toActiveDiscount(row);
    const discount_amount =
        discount === null
            ? new Prisma.Decimal(0)
            : computeDiscountAmount(
                  discount.type,
                  discount.value,
                  discount.max_discount_amount,
                  row.market_variant.price,
              );

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
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toCartView(row: CartRow): CartView {
    return {
        id: row.id,
        total: row.total,
        customer_id: row.customer_id,
        items: row.items.map(toCartItemView),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
