import type { Coupon, CouponStatus, CouponType } from '@app/common';
import type { CouponSummary, CouponUsageRow } from '../types/coupon.type.js';

export type CouponView = {
    id: string;
    code: string;
    type: CouponType;
    value: Coupon['value'];
    max_discount_amount: Coupon['max_discount_amount'];
    status: CouponStatus;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
};

export type CouponUsageView = {
    id: string;
    coupon_code: string;
    order_number: string | null;
    customer_name: string | null;
    guest_email: string | null;
    created_at: Date;
};

export type CouponUsagePage = {
    items: CouponUsageView[];
    next_cursor: string | null;
};

export function toCouponView(coupon: Coupon): CouponView {
    return {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        max_discount_amount: coupon.max_discount_amount,
        status: coupon.status,
        expires_at: coupon.expires_at,
        created_at: coupon.created_at,
        updated_at: coupon.updated_at,
    };
}

export function toCouponSummary(
    coupon: Pick<
        Coupon,
        'id' | 'code' | 'type' | 'value' | 'status' | 'expires_at'
    > & { usage_count: number },
): CouponSummary {
    return {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        status: coupon.status,
        expires_at: coupon.expires_at,
        usage_count: coupon.usage_count,
    };
}

export function toCouponUsageView(row: CouponUsageRow): CouponUsageView {
    return {
        id: row.id,
        coupon_code: row.coupon.code,
        order_number: row.order?.order_number ?? null,
        customer_name: row.customer?.name ?? null,
        guest_email: row.guest_email,
        created_at: row.created_at,
    };
}
