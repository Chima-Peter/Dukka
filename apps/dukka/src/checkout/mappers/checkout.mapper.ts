import type { Order, OrderStatus, Prisma } from '@app/common';
import {
    toMarketPaymentMethodView,
    toPaymentAttemptView,
    type MarketPaymentMethodView,
    type PaymentAttemptView,
} from '../../payments/mappers/payment.mapper.js';
import type { MarketPaymentMethodDetail } from '../../payments/types/payment.type.js';
import type { PaymentAttemptDetail } from '../../payments/types/payment.type.js';

export type CheckoutOrderView = {
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
};

export type CheckoutResultView = {
    order: CheckoutOrderView;
    payment_attempt: PaymentAttemptView;
    authorization_url: string | null;
};

export function toCheckoutOrderView(order: Order): CheckoutOrderView {
    return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        currency: order.currency,
        subtotal: order.subtotal,
        shipping_fee: order.shipping_fee,
        discount_amount: order.discount_amount,
        points_discount: order.points_discount,
        coupon_discount: order.coupon_discount,
        total_amount: order.total_amount,
        guest_email: order.guest_email,
        guest_name: order.guest_name,
        guest_phone_number: order.guest_phone_number,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        market_id: order.market_id,
        customer_id: order.customer_id,
        created_at: order.created_at,
    };
}

export function toCheckoutResultView(input: {
    order: Order;
    payment_attempt: PaymentAttemptDetail;
    authorization_url: string | null;
}): CheckoutResultView {
    return {
        order: toCheckoutOrderView(input.order),
        payment_attempt: toPaymentAttemptView(input.payment_attempt),
        authorization_url: input.authorization_url,
    };
}

export function toPrecheckoutPaymentMethods(
    methods: MarketPaymentMethodDetail[],
): MarketPaymentMethodView[] {
    return methods.map(toMarketPaymentMethodView);
}
