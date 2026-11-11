import type {
    OrderPaymentAttemptStatus,
    OrderRefundAuditAction,
    OrderRefundAuditActorType,
    OrderRefundStatus,
    Prisma,
} from '@app/common';
import type {
    marketPaymentMethodSelect,
    orderRefundAuditSelect,
    orderRefundDetailSelect,
    orderRefundSummarySelect,
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

export type OrderRefundSummary = Prisma.OrderRefundGetPayload<{
    select: typeof orderRefundSummarySelect;
}>;

export type OrderRefundPage = {
    items: OrderRefundSummary[];
    next_cursor: string | null;
};

export type OrderRefundDetail = Prisma.OrderRefundGetPayload<{
    select: typeof orderRefundDetailSelect;
}>;

export type OrderRefundAuditDetail = Prisma.OrderRefundAuditGetPayload<{
    select: typeof orderRefundAuditSelect;
}>;

export type OrderRefundActorMetadata = {
    actor: {
        type: 'staff' | 'customer' | 'system';
        id?: string;
        name?: string;
        role_id?: string | null;
        role_name?: string | null;
        source:
            | 'staff_retry'
            | 'staff_retry_with_customer_details'
            | 'customer_cancel'
            | 'inventory_blocked'
            | 'account_deletion'
            | 'cancel_order';
    };
};

export type CreateOrderRefundAuditInput = {
    action: OrderRefundAuditAction;
    order_id: string;
    order_refund_id: string;
    actor_type: OrderRefundAuditActorType;
    performed_by_name: string;
    performed_by_id?: string | null;
    new_status?: OrderRefundStatus | null;
    provider_refund_id?: string | null;
    amount?: Prisma.Decimal | number | string | null;
    currency?: string | null;
    detail?: Prisma.InputJsonValue | null;
};

export type NestedOrderRefundAuditInput = Omit<
    CreateOrderRefundAuditInput,
    'order_refund_id' | 'order_id'
> & {
    order_id?: string;
};

export type MarkRefundStatusInput = {
    id: string;
    status: Extract<
        OrderRefundStatus,
        'NEEDS_ATTENTION' | 'PENDING' | 'PROCESSED' | 'FAILED'
    >;
    from_statuses?: Array<
        Extract<OrderRefundStatus, 'PENDING' | 'NEEDS_ATTENTION'>
    >;
    refunded_at?: Date | null;
    metadata?: OrderRefundActorMetadata | Prisma.InputJsonValue | null;
    audit?: NestedOrderRefundAuditInput;
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
    audit?: NestedOrderRefundAuditInput;
};

export type AttachProviderRefundIdInput = {
    id: string;
    provider_refund_id: string;
    audit?: NestedOrderRefundAuditInput;
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
