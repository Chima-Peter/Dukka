import type { Prisma } from '@app/common';

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
    created_at: true,
    order_id: true,
} satisfies Prisma.OrderPaymentAttemptSelect;

export const paymentAttemptDetailSelect = {
    id: true,
    status: true,
    payment_method_name: true,
    payment_intent_id: true,
    payment_intent_url: true,
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
            warehouse_id: true,
            market_id: true,
            warehouse: {
                select: {
                    id: true,
                    name: true,
                    country_id: true,
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
