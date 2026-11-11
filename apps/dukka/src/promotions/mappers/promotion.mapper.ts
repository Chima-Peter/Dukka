import type {
    Discount,
    DiscountType,
    Prisma,
    Promotion,
    PromotionMarketStatus,
    PromotionStatus,
} from '@app/common';
import {
    marketSummarySelect,
    promotionUsageSelect,
    variantTargetInclude,
} from '../types/promotion.type.js';

export type PromotionMarketView = {
    id: string;
    promotion_id: string;
    market_id: string;
    status: PromotionMarketStatus;
    start_date: Date;
    end_date: Date;
    created_at: Date;
    updated_at: Date;
    market: {
        id: string;
        name: string;
        code: string;
    };
};

export type PromotionDetailView = {
    id: string;
    name: string;
    description: string;
    code: string;
    status: PromotionStatus;
    discount_id: string;
    created_at: Date;
    updated_at: Date;
    discount: {
        id: string;
        type: DiscountType;
        value: Discount['value'];
        max_discount_amount: Discount['max_discount_amount'];
        created_at: Date;
        updated_at: Date;
    };
    promotion_markets: PromotionMarketView[];
};

export type PromotionUsageView = {
    id: string;
    discount_amount: Prisma.Decimal;
    redeemed_at: Date;
    created_at: Date;
    order_id: string | null;
    customer_id: string | null;
    promotion_market_id: string;
    promotion: {
        id: string;
        name: string;
        code: string;
    };
    market_id: string;
    order: {
        id: string;
        order_number: string;
    } | null;
    customer: {
        id: string;
        name: string;
        email: string;
    } | null;
};

export type PromotionTargetView = {
    id: string;
    market_variant_id: string;
    price: Prisma.Decimal;
    currency: string;
    sold_out: boolean;
    status: string;
    variant_id: string;
    variant_code: string;
    color: string | null;
    size: string | null;
    product_id: string;
    product_name: string;
    created_at: Date;
};

export type PromotionUsagePage = {
    items: PromotionUsageView[];
    next_cursor: string | null;
};

export type PromotionTargetPage = {
    items: PromotionTargetView[];
    next_cursor: string | null;
};

type PromotionMarketRow = {
    id: string;
    promotion_id: string;
    market_id: string;
    status: PromotionMarketStatus;
    start_date: Date;
    end_date: Date;
    created_at: Date;
    updated_at: Date;
    market: {
        id: string;
        name: string;
        code: string;
    };
};

type PromotionDetailRow = Promotion & {
    discount: Discount;
    promotion_markets: PromotionMarketRow[];
};

type PromotionUsageRow = Prisma.PromotionUsageGetPayload<{
    select: typeof promotionUsageSelect;
}>;

type PromotionTargetRow = {
    id: string;
    created_at: Date;
    variant: {
        id: string;
        price: Prisma.Decimal;
        currency: string;
        sold_out: boolean;
        status: string;
        variant: {
            id: string;
            variant_code: string;
            color: string | null;
            size: string | null;
            product: {
                id: string;
                name: string;
            };
        };
    };
};

export type PromotionView = {
    id: string;
    name: string;
    description: string;
    code: string;
    status: PromotionStatus;
    discount_id: string;
    created_at: Date;
    updated_at: Date;
};

export type DiscountView = {
    id: string;
    type: DiscountType;
    value: Discount['value'];
    max_discount_amount: Discount['max_discount_amount'];
    created_at: Date;
    updated_at: Date;
};

export type PromotionWithDiscountView = PromotionView & {
    discount: DiscountView;
};

export function toPromotionView(
    row: Pick<
        Promotion,
        | 'id'
        | 'name'
        | 'description'
        | 'code'
        | 'status'
        | 'discount_id'
        | 'created_at'
        | 'updated_at'
    >,
): PromotionView {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        code: row.code,
        status: row.status,
        discount_id: row.discount_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toDiscountView(row: Discount): DiscountView {
    return {
        id: row.id,
        type: row.type,
        value: row.value,
        max_discount_amount: row.max_discount_amount,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toPromotionWithDiscountView(
    row: Pick<
        Promotion,
        | 'id'
        | 'name'
        | 'description'
        | 'code'
        | 'status'
        | 'discount_id'
        | 'created_at'
        | 'updated_at'
    > & { discount: Discount },
): PromotionWithDiscountView {
    return {
        ...toPromotionView(row),
        discount: toDiscountView(row.discount),
    };
}

export function toPromotionMarketView(
    row: PromotionMarketRow,
): PromotionMarketView {
    return {
        id: row.id,
        promotion_id: row.promotion_id,
        market_id: row.market_id,
        status: row.status,
        start_date: row.start_date,
        end_date: row.end_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
        market: row.market,
    };
}

export function toPromotionDetail(
    row: PromotionDetailRow,
): PromotionDetailView {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        code: row.code,
        status: row.status,
        discount_id: row.discount_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        discount: {
            id: row.discount.id,
            type: row.discount.type,
            value: row.discount.value,
            max_discount_amount: row.discount.max_discount_amount,
            created_at: row.discount.created_at,
            updated_at: row.discount.updated_at,
        },
        promotion_markets: row.promotion_markets.map(toPromotionMarketView),
    };
}

export function toPromotionUsageView(
    row: PromotionUsageRow,
): PromotionUsageView {
    return {
        id: row.id,
        discount_amount: row.discount_amount,
        redeemed_at: row.redeemed_at,
        created_at: row.created_at,
        order_id: row.order_id,
        customer_id: row.customer_id,
        promotion_market_id: row.promotion_market.id,
        promotion: row.promotion_market.promotion,
        market_id: row.promotion_market.market_id,
        order: row.order,
        customer: row.customer,
    };
}

export function toPromotionTargetView(
    row: PromotionTargetRow,
): PromotionTargetView {
    const marketVariant = row.variant;
    const variant = marketVariant.variant;
    return {
        id: row.id,
        market_variant_id: marketVariant.id,
        price: marketVariant.price,
        currency: marketVariant.currency,
        sold_out: marketVariant.sold_out,
        status: marketVariant.status,
        variant_id: variant.id,
        variant_code: variant.variant_code,
        color: variant.color,
        size: variant.size,
        product_id: variant.product.id,
        product_name: variant.product.name,
        created_at: row.created_at,
    };
}

export { marketSummarySelect, promotionUsageSelect, variantTargetInclude };
