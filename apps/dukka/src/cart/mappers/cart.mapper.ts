import type { Prisma } from '../../../generated/prisma/client.js';
import type { CartItemView, CartView } from '../types/cart.type.js';

export const cartItemSelect = {
    id: true,
    quantity: true,
    market_variant_id: true,
    created_at: true,
    updated_at: true,
    market_variant: {
        select: {
            price: true,
            currency: true,
            sold_out: true,
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

export function toCartItemView(row: CartItemRow): CartItemView {
    return {
        id: row.id,
        quantity: row.quantity,
        market_variant_id: row.market_variant_id,
        price: row.market_variant.price,
        currency: row.market_variant.currency,
        sold_out: row.market_variant.sold_out,
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
