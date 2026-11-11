import type {
    CouponType,
    DiscountType,
    OrderPaymentAttemptStatus,
    OrderStatus,
    Prisma,
    ShipmentStatus,
    WarehouseStatus,
} from '@app/common';
import type { OrderSummary } from '../types/order.type.js';

export const orderSummarySelect = {
    id: true,
    status: true,
    order_number: true,
    total_amount: true,
    guest_name: true,
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

export type CustomerOrderDetailRow = Prisma.OrderGetPayload<{
    select: typeof customerOrderDetailSelect;
}>;

export type StaffOrderDetailRow = Prisma.OrderGetPayload<{
    select: typeof staffOrderDetailSelect;
}>;

export type OrderPaymentAttemptView = {
    id: string;
    status: OrderPaymentAttemptStatus;
    payment_method_name: string;
    payment_method: { id: string; name: string } | null;
    created_at: Date;
};

export type OrderCouponUsageView = {
    id: string;
    guest_email: string | null;
    coupon_id: string;
    customer_id: string | null;
    created_at: Date;
    coupon: {
        id: string;
        code: string;
        type: CouponType;
        value: Prisma.Decimal;
    };
};

export type OrderItemDetailView = {
    id: string;
    quantity: number;
    price: Prisma.Decimal;
    total: Prisma.Decimal;
    discount_type: DiscountType | null;
    discount_value: Prisma.Decimal | null;
    max_discount_amount: Prisma.Decimal | null;
    discount_amount: Prisma.Decimal | null;
    promotion_market_id: string | null;
    product_name: string;
    product_image: string | null;
    product_specs: Prisma.JsonValue;
    market_variant_id: string | null;
    created_at: Date;
    updated_at: Date;
};

export type OrderPromotionUsageView = {
    id: string;
    discount_amount: Prisma.Decimal;
    redeemed_at: Date;
    promotion_market_id: string;
    customer_id: string | null;
    created_at: Date;
};

export type CustomerOrderDetail = {
    id: string;
    order_number: string;
    status: OrderStatus;
    currency: string;
    subtotal: Prisma.Decimal;
    shipping_fee: Prisma.Decimal;
    discount_amount: Prisma.Decimal;
    points_discount: Prisma.Decimal;
    coupon_discount: Prisma.Decimal;
    total_amount: Prisma.Decimal;
    guest_email: string | null;
    guest_name: string | null;
    guest_phone_number: string | null;
    shipping_address: Prisma.JsonValue;
    billing_address: Prisma.JsonValue;
    market_id: string;
    customer_id: string | null;
    created_at: Date;
    market: { id: string; name: string; code: string };
    order_items: OrderItemDetailView[];
    order_payment_attempt: OrderPaymentAttemptView | null;
    promotion_usages: OrderPromotionUsageView[];
    coupon_usages: OrderCouponUsageView[];
    shipment: {
        tracking_number: string;
        shipment_movements: Array<{
            id: string;
            movement_type: string;
            performed_by: string | null;
            occurred_at: Date;
            recorded_at: Date;
            metadata: Prisma.JsonValue | null;
            from_location: { id: string; type: string; name: string } | null;
            to_location: { id: string; type: string; name: string } | null;
            shipment_leg_id: string | null;
            created_at: Date;
        }>;
    } | null;
};

export type StaffOrderDetail = {
    id: string;
    order_number: string;
    status: OrderStatus;
    currency: string;
    subtotal: Prisma.Decimal;
    shipping_fee: Prisma.Decimal;
    discount_amount: Prisma.Decimal;
    points_discount: Prisma.Decimal;
    coupon_discount: Prisma.Decimal;
    total_amount: Prisma.Decimal;
    guest_email: string | null;
    guest_name: string | null;
    guest_phone_number: string | null;
    shipping_address: Prisma.JsonValue;
    billing_address: Prisma.JsonValue;
    market_id: string;
    warehouse_id: string;
    customer_id: string | null;
    created_at: Date;
    updated_at: Date;
    market: { id: string; name: string; code: string };
    warehouse: {
        id: string;
        name: string;
        address: string;
        status: WarehouseStatus;
        market_id: string;
    };
    customer: {
        id: string;
        name: string;
        email: string;
        phone_number: string | null;
    } | null;
    order_items: OrderItemDetailView[];
    order_payment_attempt: OrderPaymentAttemptView | null;
    promotion_usages: OrderPromotionUsageView[];
    coupon_usages: OrderCouponUsageView[];
    shipment: {
        id: string;
        tracking_number: string;
        status: ShipmentStatus;
        created_at: Date;
        updated_at: Date;
        origin_location: {
            id: string;
            type: string;
            name: string;
            warehouse_id: string | null;
            distribution_point_id: string | null;
            customer_id: string | null;
        } | null;
        destination_location: {
            id: string;
            type: string;
            name: string;
            warehouse_id: string | null;
            distribution_point_id: string | null;
            customer_id: string | null;
        } | null;
        current_location: {
            id: string;
            type: string;
            name: string;
            warehouse_id: string | null;
            distribution_point_id: string | null;
            customer_id: string | null;
        } | null;
        shipment_legs: Array<{
            id: string;
            expected_departure_date: Date | null;
            actual_departure_date: Date | null;
            expected_arrival_date: Date | null;
            actual_arrival_date: Date | null;
            created_at: Date;
            updated_at: Date;
            origin_location: { id: string; type: string; name: string };
            destination_location: { id: string; type: string; name: string };
            logistics_partner: {
                id: string;
                name: string;
                code: string;
            } | null;
        }>;
        shipment_movements: Array<{
            id: string;
            movement_type: string;
            performed_by: string | null;
            occurred_at: Date;
            recorded_at: Date;
            metadata: Prisma.JsonValue | null;
            from_location: { id: string; type: string; name: string } | null;
            to_location: { id: string; type: string; name: string } | null;
            shipment_leg_id: string | null;
            created_at: Date;
        }>;
    } | null;
};

function toOrderPaymentAttemptView(
    row: CustomerOrderDetailRow['order_payment_attempt'],
): OrderPaymentAttemptView | null {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        status: row.status,
        payment_method_name: row.payment_method_name,
        payment_method: row.market_payment_method?.payment_method ?? null,
        created_at: row.created_at,
    };
}

function toOrderCouponUsageView(
    row: CustomerOrderDetailRow['coupon_usages'][number],
): OrderCouponUsageView {
    return {
        id: row.id,
        guest_email: row.guest_email,
        coupon_id: row.coupon_id,
        customer_id: row.customer_id,
        created_at: row.created_at,
        coupon: row.coupon,
    };
}

export function toOrderSummary(row: OrderSummaryRow): OrderSummary {
    return {
        id: row.id,
        status: row.status,
        order_number: row.order_number,
        amount: row.total_amount,
        quantity: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
        name: row.customer?.name ?? row.guest_name,
        created_at: row.created_at,
    };
}

export function toCustomerOrderDetail(
    row: CustomerOrderDetailRow,
): CustomerOrderDetail {
    return {
        id: row.id,
        order_number: row.order_number,
        status: row.status,
        currency: row.currency,
        subtotal: row.subtotal,
        shipping_fee: row.shipping_fee,
        discount_amount: row.discount_amount,
        points_discount: row.points_discount,
        coupon_discount: row.coupon_discount,
        total_amount: row.total_amount,
        guest_email: row.guest_email,
        guest_name: row.guest_name,
        guest_phone_number: row.guest_phone_number,
        shipping_address: row.shipping_address,
        billing_address: row.billing_address,
        market_id: row.market_id,
        customer_id: row.customer_id,
        created_at: row.created_at,
        market: row.market,
        order_items: row.order_items,
        order_payment_attempt: toOrderPaymentAttemptView(
            row.order_payment_attempt,
        ),
        promotion_usages: row.promotion_usages,
        coupon_usages: row.coupon_usages.map(toOrderCouponUsageView),
        shipment: row.shipment,
    };
}

export function toStaffOrderDetail(
    row: StaffOrderDetailRow,
): StaffOrderDetail {
    return {
        id: row.id,
        order_number: row.order_number,
        status: row.status,
        currency: row.currency,
        subtotal: row.subtotal,
        shipping_fee: row.shipping_fee,
        discount_amount: row.discount_amount,
        points_discount: row.points_discount,
        coupon_discount: row.coupon_discount,
        total_amount: row.total_amount,
        guest_email: row.guest_email,
        guest_name: row.guest_name,
        guest_phone_number: row.guest_phone_number,
        shipping_address: row.shipping_address,
        billing_address: row.billing_address,
        market_id: row.market_id,
        warehouse_id: row.warehouse_id,
        customer_id: row.customer_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        market: row.market,
        warehouse: row.warehouse,
        customer: row.customer,
        order_items: row.order_items,
        order_payment_attempt: toOrderPaymentAttemptView(
            row.order_payment_attempt,
        ),
        promotion_usages: row.promotion_usages,
        coupon_usages: row.coupon_usages.map(toOrderCouponUsageView),
        shipment: row.shipment,
    };
}
