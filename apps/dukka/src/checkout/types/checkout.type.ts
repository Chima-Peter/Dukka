import type {
    BillingAddress,
    Order,
    ShippingAddress,
} from '@app/common';
import type { CreateOrderItemInput } from '../../orders/types/create-order.type.js';
import type { PaymentAttemptDetail } from '../../payments/types/payment.type.js';
import type { CheckoutResultView } from '../mappers/checkout.mapper.js';

/** Internal checkout payload before API mapping. */
export type CheckoutResultRaw = {
    order: Order;
    payment_attempt: PaymentAttemptDetail;
    authorization_url: string | null;
};

export type CheckoutResult = CheckoutResultView;

export type ResolvedAddresses = {
    shipping: ShippingAddress;
    billing: ShippingAddress | BillingAddress;
};

export type BillBreakdown = {
    currency: string;
    subtotal: number;
    shipping_fee: number;
    discount_amount: number;
    points_discount: number;
    coupon_discount: number;
    total_amount: number;
    points_to_redeem: number;
    items: CreateOrderItemInput[];
};
