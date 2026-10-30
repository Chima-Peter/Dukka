import type { DiscountType, Prisma } from '@app/common';

export type CartItemDiscount = {
    type: DiscountType;
    value: Prisma.Decimal;
    max_discount_amount: Prisma.Decimal;
};

export type CartItemView = {
    id: string;
    quantity: number;
    market_variant_id: string;
    promotion_market_id: string | null;
    price: Prisma.Decimal;
    discount: CartItemDiscount | null;
    discount_amount: Prisma.Decimal;
    currency: string;
    sold_out: boolean;
    promotion_warning: string | null;
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

export type CartAddView = CartView & {
    promotion_warning: string | null;
};
