import type {
    Discount,
    Promotion,
    PromotionMarket,
    PromotionMarketStatus,
    PromotionStatus,
} from '@app/common';

export const TARGET_PAGE_SIZE = 20;

export const marketSummarySelect = {
    id: true,
    name: true,
    code: true,
} as const;

export const variantTargetInclude = {
    variant: {
        select: {
            id: true,
            price: true,
            currency: true,
            sold_out: true,
            status: true,
            variant: {
                select: {
                    id: true,
                    variant_code: true,
                    color: true,
                    size: true,
                    product: { select: { id: true, name: true } },
                },
            },
        },
    },
} as const;

export const discountSummarySelect = {
    id: true,
    type: true,
    value: true,
    max_discount_amount: true,
} as const;

export type PromotionSummary = {
    id: string;
    name: string;
    code: string;
    status: PromotionStatus;
    created_at: Date;
    discount: {
        id: string;
        type: Discount['type'];
        value: Discount['value'];
        max_discount_amount: Discount['max_discount_amount'];
    };
    market_count: number;
};

export type PromotionWithDiscount = Promotion & {
    discount: Discount;
};

export type DiscountSummary = Discount & {
    promotions: {
        id: string;
        name: string;
        code: string;
        status: PromotionStatus;
    }[];
};

export type PromotionTargetPage = {
    items: unknown[];
    next_cursor: string | null;
};

export type PromotionMarketDetail = PromotionMarket & {
    market: {
        id: string;
        name: string;
        code: string;
    };
};

export type PromotionMarketStatusRecord = {
    id: string;
    status: PromotionMarketStatus;
    market_id: string;
    start_date: Date;
    end_date: Date;
};

export type PromotionDetail = Promotion & {
    discount: Discount;
    promotion_markets: PromotionMarketDetail[];
};

export const promotionUsageSelect = {
    id: true,
    discount_amount: true,
    redeemed_at: true,
    created_at: true,
    order_id: true,
    customer_id: true,
    promotion_market: {
        select: {
            id: true,
            market_id: true,
            promotion: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    order: {
        select: {
            id: true,
            order_number: true,
        },
    },
    customer: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
} as const;

export type PromotionUsagePage = {
    items: unknown[];
    next_cursor: string | null;
};
