import type { Prisma } from '@app/common';
import type { OrderSummary } from '../types/order.type.js';

export const orderSummarySelect = {
    id: true,
    status: true,
    order_number: true,
    total_amount: true,
    guest_name: true,
    market_id: true,
    created_at: true,
    customer: {
        select: {
            name: true,
        },
    },
    order_items: {
        select: {
            quantity: true,
        },
    },
} satisfies Prisma.OrderSelect;

const orderItemDetailSelect = {
    id: true,
    quantity: true,
    price: true,
    total: true,
    product_name: true,
    product_image: true,
    product_specs: true,
    market_variant_id: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.OrderItemsSelect;

const orderPaymentAttemptSelect = {
    id: true,
    status: true,
    payment_method: {
        select: {
            id: true,
            name: true,
        },
    },
    created_at: true,
} satisfies Prisma.OrderPaymentAttemptSelect;

export const customerOrderDetailSelect = {
    id: true,
    order_number: true,
    status: true,
    currency: true,
    subtotal: true,
    shipping_fee: true,
    discount_amount: true,
    points_discount: true,
    coupon_discount: true,
    total_amount: true,
    guest_email: true,
    guest_name: true,
    guest_phone_number: true,
    shipping_address: true,
    billing_address: true,
    market_id: true,
    customer_id: true,
    created_at: true,
    market: {
        select: {
            id: true,
            name: true,
            code: true,
        },
    },
    order_items: {
        select: orderItemDetailSelect,
        orderBy: { created_at: 'asc' as const },
    },
    order_payment_attempts: {
        select: orderPaymentAttemptSelect,
        orderBy: { created_at: 'desc' as const },
    },
} satisfies Prisma.OrderSelect;

export const staffOrderDetailSelect = {
    id: true,
    order_number: true,
    status: true,
    currency: true,
    subtotal: true,
    shipping_fee: true,
    discount_amount: true,
    points_discount: true,
    coupon_discount: true,
    total_amount: true,
    guest_email: true,
    guest_name: true,
    guest_phone_number: true,
    shipping_address: true,
    billing_address: true,
    market_id: true,
    warehouse_id: true,
    customer_id: true,
    created_at: true,
    updated_at: true,
    market: {
        select: {
            id: true,
            name: true,
            code: true,
        },
    },
    warehouse: {
        select: {
            id: true,
            name: true,
            address: true,
            status: true,
            market_id: true,
        },
    },
    customer: {
        select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
        },
    },
    order_items: {
        select: orderItemDetailSelect,
        orderBy: { created_at: 'asc' as const },
    },
    order_payment_attempts: {
        select: orderPaymentAttemptSelect,
        orderBy: { created_at: 'desc' as const },
    },
} satisfies Prisma.OrderSelect;

type OrderSummaryRow = Prisma.OrderGetPayload<{
    select: typeof orderSummarySelect;
}>;

export function toOrderSummary(row: OrderSummaryRow): OrderSummary {
    return {
        id: row.id,
        status: row.status,
        order_number: row.order_number,
        amount: row.total_amount,
        quantity: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
        name: row.customer?.name ?? row.guest_name,
        market_id: row.market_id,
        created_at: row.created_at,
    };
}
