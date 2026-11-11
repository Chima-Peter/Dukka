import type { CouponStatus, CouponType, Prisma } from '@app/common';

export type CouponSummary = {
    id: string;
    code: string;
    type: CouponType;
    value: Prisma.Decimal;
    status: CouponStatus;
    expires_at: Date;
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
    coupon: {
        select: {
            code: true,
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

export type CouponUsageRow = Prisma.CouponUsageGetPayload<{
    select: typeof couponUsageSelect;
}>;

export type CouponUsageRowPage = {
    items: CouponUsageRow[];
    next_cursor: string | null;
};
