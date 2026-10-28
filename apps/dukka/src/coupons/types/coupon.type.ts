import type { Coupon } from '@app/common';

export type CouponSummary = Coupon & {
    usage_count: number;
};

export type CouponPage = {
    items: CouponSummary[];
    next_cursor: string | null;
};

export const couponUsageSelect = {
    id: true,
    guest_email: true,
    created_at: true,
    coupon_id: true,
    order_id: true,
    customer_id: true,
    coupon: {
        select: {
            id: true,
            code: true,
            type: true,
            value: true,
        },
    },
    order: {
        select: {
            id: true,
            order_number: true,
            market_id: true,
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

export type CouponUsagePage = {
    items: unknown[];
    next_cursor: string | null;
};
