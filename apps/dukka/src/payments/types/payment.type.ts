import type {
    OrderPaymentAttemptStatus,
    OrderRefundStatus,
    Prisma,
} from '@app/common';
import type {
    marketPaymentMethodSelect,
    orderRefundDetailSelect,
    paymentAttemptDetailSelect,
    paymentAttemptSummarySelect,
    paymentMethodDetailSelect,
} from '../mappers/payment.mapper.js';

export type MarketPaymentMethodDetail = Prisma.MarketPaymentMethodGetPayload<{
    select: typeof marketPaymentMethodSelect;
}>;

export type PaymentMethodDetail = Prisma.PaymentMethodGetPayload<{
    select: typeof paymentMethodDetailSelect;
}>;

export type PaymentAttemptSummary = Prisma.OrderPaymentAttemptGetPayload<{
    select: typeof paymentAttemptSummarySelect;
}>;

export type PaymentAttemptDetail = Prisma.OrderPaymentAttemptGetPayload<{
    select: typeof paymentAttemptDetailSelect;
}>;

export type PaymentAttemptPage = {
    items: PaymentAttemptSummary[];
    next_cursor: string | null;
};

export type OrderRefundDetail = Prisma.OrderRefundGetPayload<{
    select: typeof orderRefundDetailSelect;
}>;

export type MarkRefundStatusInput = {
    id: string;
    status: Extract<
        OrderRefundStatus,
        'PROCESSED' | 'FAILED'
    >;
    refunded_at?: Date | null;
};

export type OrderRefundActorMetadata = {
    actor: {
        type: 'staff' | 'system';
        id?: string;
        name?: string;
        role_id?: string | null;
        role_name?: string | null;
        source: 'staff_retry' | 'cancel_order';
    };
};

export type CreateOrderRefundInput = {
    amount: Prisma.Decimal | number | string;
    currency: string;
    provider: string;
    payment_reference: string;
    order_id: string;
    order_payment_attempt_id?: string | null;
    customer_note?: string | null;
    merchant_note?: string | null;
    provider_refund_id?: string | null;
    metadata?: OrderRefundActorMetadata | Prisma.InputJsonValue | null;
};

export type StaffRetryRefundResult = {
    refund_id: string;
    order_id: string;
    provider_refund_id: string | null;
    payment_reference: string | null;
    status: OrderRefundStatus;
};

export type CreatePaymentAttemptInput = {
    order_id: string;
    market_payment_method_id: string;
    payment_method_name: string;
    status?: OrderPaymentAttemptStatus;
    payment_intent_id?: string;
    payment_intent_url?: string;
};

export type UpdatePaymentIntentInput = {
    payment_intent_id: string;
    payment_intent_url?: string;
};

export type ConvertCashAttemptToPaystackInput = {
    payment_intent_id: string;
    payment_intent_url: string;
};

export type StaffPaystackPayResult = {
    order_id: string;
    payment_attempt_id: string;
    authorization_url: string;
    reference: string;
    status: OrderPaymentAttemptStatus;
};

export type PaymentErrorMessages = {
    conflict?: string;
    notFound?: string;
};
