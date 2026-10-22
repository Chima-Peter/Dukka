import type { Prisma } from '../../../generated/prisma/client.js';

export type CartItemView = {
    id: string;
    quantity: number;
    market_variant_id: string;
    price: Prisma.Decimal;
    currency: string;
    sold_out: boolean;
    created_at: Date;
    updated_at: Date;
};

export type CartView = {
    id: string;
    total: Prisma.Decimal;
    customer_id: string | null;
    items: CartItemView[];
    created_at: Date;
    updated_at: Date;
};

export type CartTotalView = {
    cart_id: string;
    total: Prisma.Decimal;
};
