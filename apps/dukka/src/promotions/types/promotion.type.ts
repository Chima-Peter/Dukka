import type {
    Discount,
    Prisma,
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
            price: true,
            currency: true,
            sold_out: true,
            variant: {
                select: {
                    variant_code: true,
                    image: {
                        select: {
                            image_url: true,
                        },
                    },
                    product: { select: { name: true } },
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

export type PromotionTargetRow = {
    id: string;
    variant: {
        price: Prisma.Decimal;
        currency: string;
        sold_out: boolean;
        variant: {
            variant_code: string;
            image: {
                image_url: string;
            } | null;
            product: {
                name: string;
            };
        };
    };
};

export type PromotionTargetRowPage = {
    items: PromotionTargetRow[];
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
    usage_count: number;
    usages: PromotionUsageRowPage;
};

export const promotionUsageSelect = {
    id: true,
    discount_amount: true,
    redeemed_at: true,
    created_at: true,
    promotion_market: {
        select: {
            promotion: {
                select: {
                    name: true,
                },
            },
        },
    },
    order: {
        select: {
            order_number: true,
        },
    },
    customer: {
        select: {
            name: true,
        },
    },
} as const;

export const promotionUsageNestedSelect = {
    id: true,
    discount_amount: true,
    redeemed_at: true,
    created_at: true,
    order: {
        select: {
            order_number: true,
        },
    },
    customer: {
        select: {
            name: true,
        },
    },
} as const;

export type PromotionUsageRow = Prisma.PromotionUsageGetPayload<{
    select: typeof promotionUsageSelect;
}>;

export type PromotionUsageRowPage = {
    items: PromotionUsageRow[];
    next_cursor: string | null;
};
