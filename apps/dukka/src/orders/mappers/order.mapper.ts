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
    discount_type: true,
    discount_value: true,
    max_discount_amount: true,
    discount_amount: true,
    promotion_market_id: true,
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
    payment_method_name: true,
    market_payment_method: {
        select: {
            id: true,
            payment_method: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
    created_at: true,
} satisfies Prisma.OrderPaymentAttemptSelect;

const promotionUsageSelect = {
    id: true,
    discount_amount: true,
    redeemed_at: true,
    promotion_market_id: true,
    customer_id: true,
    created_at: true,
} satisfies Prisma.PromotionUsageSelect;

const couponUsageSelect = {
    id: true,
    guest_email: true,
    coupon_id: true,
    customer_id: true,
    created_at: true,
    coupon: {
        select: {
            id: true,
            code: true,
            type: true,
            value: true,
        },
    },
} satisfies Prisma.CouponUsageSelect;

const shipmentMovementDetailSelect = {
    id: true,
    movement_type: true,
    performed_by: true,
    occurred_at: true,
    recorded_at: true,
    metadata: true,
    from_location: {
        select: {
            id: true,
            type: true,
            name: true,
        },
    },
    to_location: {
        select: {
            id: true,
            type: true,
            name: true,
        },
    },
    shipment_leg_id: true,
    created_at: true,
} satisfies Prisma.ShipmentMovementSelect;

const orderShipmentDetailSelect = {
    id: true,
    tracking_number: true,
    status: true,
    created_at: true,
    updated_at: true,
    origin_location: {
        select: {
            id: true,
            type: true,
            name: true,
            warehouse_id: true,
            distribution_point_id: true,
            customer_id: true,
        },
    },
    destination_location: {
        select: {
            id: true,
            type: true,
            name: true,
            warehouse_id: true,
            distribution_point_id: true,
            customer_id: true,
        },
    },
    current_location: {
        select: {
            id: true,
            type: true,
            name: true,
            warehouse_id: true,
            distribution_point_id: true,
            customer_id: true,
        },
    },
    shipment_legs: {
        orderBy: [
            { created_at: 'asc' as const },
            { id: 'asc' as const },
        ],
        select: {
            id: true,
            expected_departure_date: true,
            actual_departure_date: true,
            expected_arrival_date: true,
            actual_arrival_date: true,
            created_at: true,
            updated_at: true,
            origin_location: {
                select: {
                    id: true,
                    type: true,
                    name: true,
                },
            },
            destination_location: {
                select: {
                    id: true,
                    type: true,
                    name: true,
                },
            },
            logistics_partner: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    shipment_movements: {
        orderBy: [
            { occurred_at: 'asc' as const },
            { id: 'asc' as const },
        ],
        select: shipmentMovementDetailSelect,
    },
} satisfies Prisma.ShipmentSelect;

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
    order_payment_attempt: {
        select: orderPaymentAttemptSelect,
    },
    promotion_usages: {
        select: promotionUsageSelect,
    },
    coupon_usages: {
        select: couponUsageSelect,
    },
    shipment: {
        select: {
            tracking_number: true,
            shipment_movements: {
                orderBy: [
                    { occurred_at: 'asc' as const },
                    { id: 'asc' as const },
                ],
                select: shipmentMovementDetailSelect,
            },
        },
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
    order_payment_attempt: {
        select: orderPaymentAttemptSelect,
    },
    promotion_usages: {
        select: promotionUsageSelect,
    },
    coupon_usages: {
        select: couponUsageSelect,
    },
    shipment: {
        select: orderShipmentDetailSelect,
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
