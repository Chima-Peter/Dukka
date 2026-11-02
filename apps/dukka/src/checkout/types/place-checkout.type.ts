import type { Order, OrderPaymentAttemptStatus } from '@app/common';
import type { CreateOrderBase } from '../../orders/types/create-order.type.js';
import type { PaymentAttemptDetail } from '../../payments/types/payment.type.js';

export type PlaceCheckoutReserveItem = {
    market_variant_id: string;
    quantity: number;
};

export type PlaceCheckoutInput = {
    order: CreateOrderBase;
    market_id: string;
    warehouse_id: string;
    cart_id: string;
    reserve_items: PlaceCheckoutReserveItem[];
    points_to_redeem: number;
    customer_id?: string;
    market_payment_method_id: string;
    payment_method_name: string;
    payment_attempt_status: OrderPaymentAttemptStatus;
    order_status_processing: boolean;
    payment_intent_id?: string;
    payment_intent_url?: string;
};

export type PlaceCheckoutResult = {
    order: Order;
    payment_attempt: PaymentAttemptDetail;
};
