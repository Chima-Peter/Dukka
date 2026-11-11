import type { Coupon, CouponStatus, CouponType } from '@app/common';
import type { CouponUsageRow } from '../types/coupon.type.js';

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
    guest_email: string | null;
    created_at: Date;
    coupon: {
        id: string;
        code: string;
        type: CouponType;
        value: Coupon['value'];
    };
    order: {
        id: string;
        order_number: string;
        market_id: string;
    } | null;
    customer: {
        id: string;
        name: string;
        email: string;
    } | null;
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

export function toCouponUsageView(row: CouponUsageRow): CouponUsageView {
    return {
        id: row.id,
        guest_email: row.guest_email,
        created_at: row.created_at,
        coupon: row.coupon,
        order: row.order,
        customer: row.customer,
    };
}
