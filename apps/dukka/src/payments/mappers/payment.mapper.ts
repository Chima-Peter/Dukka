import type {
    MarketStatus,
    OrderPaymentAttemptStatus,
    OrderRefundAuditAction,
    OrderRefundAuditActorType,
    OrderRefundStatus,
    OrderStatus,
    Prisma,
} from '@app/common';

export const marketPaymentMethodSelect = {
    id: true,
    market_id: true,
    payment_method_id: true,
    created_at: true,
    updated_at: true,
    payment_method: {
        select: {
            id: true,
            name: true,
        },
    },
    market: {
        select: {
            id: true,
            name: true,
            code: true,
        },
    },
} satisfies Prisma.MarketPaymentMethodSelect;

export const paymentMethodDetailSelect = {
    id: true,
    name: true,
    created_at: true,
    updated_at: true,
    market_payment_methods: {
        select: {
            id: true,
            created_at: true,
            market: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                },
            },
        },
        orderBy: { created_at: 'desc' as const },
    },
} satisfies Prisma.PaymentMethodSelect;

export const paymentAttemptSummarySelect = {
    id: true,
    status: true,
    payment_method_name: true,
    expires_at: true,
    created_at: true,
    order_id: true,
} satisfies Prisma.OrderPaymentAttemptSelect;

export const paymentAttemptDetailSelect = {
    id: true,
    status: true,
    payment_method_name: true,
    payment_intent_id: true,
    payment_intent_url: true,
    expires_at: true,
    created_at: true,
    updated_at: true,
    order_id: true,
    market_payment_method_id: true,
    order: {
        select: {
            id: true,
            order_number: true,
            status: true,
            total_amount: true,
            currency: true,
            customer_id: true,
            guest_name: true,
            guest_email: true,
            shipping_address: true,
            warehouse_id: true,
            market_id: true,
            warehouse: {
                select: {
                    id: true,
                    name: true,
                    market_id: true,
                },
            },
            customer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    },
    market_payment_method: {
        select: {
            id: true,
            payment_method_id: true,
        },
    },
} satisfies Prisma.OrderPaymentAttemptSelect;

export const orderRefundSummarySelect = {
    id: true,
    amount: true,
    currency: true,
    status: true,
    provider: true,
    payment_reference: true,
    refunded_at: true,
    created_at: true,
    order_id: true,
    order: {
        select: {
            order_number: true,
            market_id: true,
            warehouse_id: true,
            market: {
                select: {
                    id: true,
                    name: true,
                },
            },
            warehouse: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
} satisfies Prisma.OrderRefundSelect;

export const orderRefundAuditSelect = {
    id: true,
    action: true,
    created_at: true,
    order_id: true,
    order_refund_id: true,
    actor_type: true,
    performed_by_id: true,
    performed_by_name: true,
    new_status: true,
    provider_refund_id: true,
    amount: true,
    currency: true,
    detail: true,
} satisfies Prisma.OrderRefundAuditSelect;

export const orderRefundDetailSelect = {
    id: true,
    amount: true,
    currency: true,
    status: true,
    provider: true,
    provider_refund_id: true,
    payment_reference: true,
    customer_note: true,
    merchant_note: true,
    refunded_at: true,
    metadata: true,
    order_id: true,
    order_payment_attempt_id: true,
    created_at: true,
    updated_at: true,
    audits: {
        select: orderRefundAuditSelect,
        orderBy: { created_at: 'asc' as const },
    },
    order: {
        select: {
            id: true,
            order_number: true,
            customer_id: true,
            market_id: true,
            warehouse_id: true,
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
                    manager_id: true,
                },
            },
        },
    },
} satisfies Prisma.OrderRefundSelect;

export type MarketPaymentMethodRow = Prisma.MarketPaymentMethodGetPayload<{
    select: typeof marketPaymentMethodSelect;
}>;

export type PaymentMethodDetailRow = Prisma.PaymentMethodGetPayload<{
    select: typeof paymentMethodDetailSelect;
}>;

export type PaymentAttemptSummaryRow = Prisma.OrderPaymentAttemptGetPayload<{
    select: typeof paymentAttemptSummarySelect;
}>;

export type PaymentAttemptDetailRow = Prisma.OrderPaymentAttemptGetPayload<{
    select: typeof paymentAttemptDetailSelect;
}>;

export type OrderRefundSummaryRow = Prisma.OrderRefundGetPayload<{
    select: typeof orderRefundSummarySelect;
}>;

export type OrderRefundDetailRow = Prisma.OrderRefundGetPayload<{
    select: typeof orderRefundDetailSelect;
}>;

export type MarketPaymentMethodView = {
    id: string;
    market_id: string;
    payment_method_id: string;
    payment_method_name: string;
    market: {
        id: string;
        name: string;
        code: string;
    };
    created_at: Date;
    updated_at: Date;
};

export type PaymentMethodDetailView = {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    markets: Array<{
        id: string;
        created_at: Date;
        market: {
            id: string;
            name: string;
            code: string;
            status: MarketStatus;
        };
    }>;
};

export type PaymentAttemptSummaryView = {
    id: string;
    status: OrderPaymentAttemptStatus;
    payment_method_name: string;
    expires_at: Date | null;
    created_at: Date;
    order_id: string;
};

export type PaymentAttemptView = {
    id: string;
    status: OrderPaymentAttemptStatus;
    payment_method_name: string;
    payment_intent_id: string | null;
    payment_intent_url: string | null;
    expires_at: Date | null;
    created_at: Date;
    updated_at: Date;
    order_id: string;
    market_payment_method_id: string | null;
    order_number: string;
    order_status: OrderStatus;
    total_amount: Prisma.Decimal;
    currency: string;
    customer_id: string | null;
    customer_name: string | null;
    guest_name: string | null;
    guest_email: string | null;
    market_id: string;
    warehouse_id: string;
    warehouse_name: string;
};

export type OrderRefundSummaryView = {
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    status: OrderRefundStatus;
    provider: string;
    payment_reference: string | null;
    refunded_at: Date | null;
    created_at: Date;
    order_id: string;
    order_number: string;
    market_id: string;
    warehouse_id: string;
    market: { id: string; name: string };
    warehouse: { id: string; name: string };
};

export type OrderRefundAuditView = {
    id: string;
    action: OrderRefundAuditAction;
    created_at: Date;
    order_id: string;
    order_refund_id: string;
    actor_type: OrderRefundAuditActorType;
    performed_by_id: string | null;
    performed_by_name: string;
    new_status: OrderRefundStatus | null;
    provider_refund_id: string | null;
    amount: Prisma.Decimal | null;
    currency: string | null;
    detail: Prisma.JsonValue | null;
};

export type OrderRefundDetailView = {
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    status: OrderRefundStatus;
    provider: string;
    provider_refund_id: string | null;
    payment_reference: string | null;
    customer_note: string | null;
    merchant_note: string | null;
    refunded_at: Date | null;
    metadata: Prisma.JsonValue | null;
    order_id: string;
    order_payment_attempt_id: string | null;
    created_at: Date;
    updated_at: Date;
    order_number: string;
    customer_id: string | null;
    market_id: string;
    warehouse_id: string;
    market: { id: string; name: string; code: string };
    warehouse: { id: string; name: string; manager_id: string };
    audits: OrderRefundAuditView[];
};

export type PaymentMethodView = {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
};

export function toPaymentMethodView(row: {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}): PaymentMethodView {
    return {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toMarketPaymentMethodView(
    row: MarketPaymentMethodRow,
): MarketPaymentMethodView {
    return {
        id: row.id,
        market_id: row.market_id,
        payment_method_id: row.payment_method_id,
        payment_method_name: row.payment_method.name,
        market: row.market,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toPaymentMethodDetailView(
    row: PaymentMethodDetailRow,
): PaymentMethodDetailView {
    return {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        markets: row.market_payment_methods.map((assignment) => ({
            id: assignment.id,
            created_at: assignment.created_at,
            market: assignment.market,
        })),
    };
}

export function toPaymentAttemptSummaryView(
    row: PaymentAttemptSummaryRow,
): PaymentAttemptSummaryView {
    return {
        id: row.id,
        status: row.status,
        payment_method_name: row.payment_method_name,
        expires_at: row.expires_at,
        created_at: row.created_at,
        order_id: row.order_id,
    };
}

export function toPaymentAttemptView(
    row: PaymentAttemptDetailRow,
): PaymentAttemptView {
    return {
        id: row.id,
        status: row.status,
        payment_method_name: row.payment_method_name,
        payment_intent_id: row.payment_intent_id,
        payment_intent_url: row.payment_intent_url,
        expires_at: row.expires_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        order_id: row.order_id,
        market_payment_method_id: row.market_payment_method_id,
        order_number: row.order.order_number,
        order_status: row.order.status,
        total_amount: row.order.total_amount,
        currency: row.order.currency,
        customer_id: row.order.customer_id,
        customer_name: row.order.customer?.name ?? null,
        guest_name: row.order.guest_name,
        guest_email: row.order.guest_email,
        market_id: row.order.market_id,
        warehouse_id: row.order.warehouse_id,
        warehouse_name: row.order.warehouse.name,
    };
}

export function toOrderRefundSummaryView(
    row: OrderRefundSummaryRow,
): OrderRefundSummaryView {
    return {
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        payment_reference: row.payment_reference,
        refunded_at: row.refunded_at,
        created_at: row.created_at,
        order_id: row.order_id,
        order_number: row.order.order_number,
        market_id: row.order.market_id,
        warehouse_id: row.order.warehouse_id,
        market: row.order.market,
        warehouse: row.order.warehouse,
    };
}

export function toOrderRefundDetailView(
    row: OrderRefundDetailRow,
): OrderRefundDetailView {
    return {
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        provider_refund_id: row.provider_refund_id,
        payment_reference: row.payment_reference,
        customer_note: row.customer_note,
        merchant_note: row.merchant_note,
        refunded_at: row.refunded_at,
        metadata: row.metadata,
        order_id: row.order_id,
        order_payment_attempt_id: row.order_payment_attempt_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        order_number: row.order.order_number,
        customer_id: row.order.customer_id,
        market_id: row.order.market_id,
        warehouse_id: row.order.warehouse_id,
        market: row.order.market,
        warehouse: row.order.warehouse,
        audits: row.audits.map((audit) => ({
            id: audit.id,
            action: audit.action,
            created_at: audit.created_at,
            order_id: audit.order_id,
            order_refund_id: audit.order_refund_id,
            actor_type: audit.actor_type,
            performed_by_id: audit.performed_by_id,
            performed_by_name: audit.performed_by_name,
            new_status: audit.new_status,
            provider_refund_id: audit.provider_refund_id,
            amount: audit.amount,
            currency: audit.currency,
            detail: audit.detail,
        })),
    };
}
