import { OrderRefundStatus } from '@app/common';

export const PAYSTACK_REFUND_EVENT_NAMES = [
    'refund.needs-attention',
    'refund.processed',
    'refund.failed',
] as const;

export type PaystackRefundWebhookEventName =
    (typeof PAYSTACK_REFUND_EVENT_NAMES)[number];

export const PAYSTACK_REFUND_EVENTS: ReadonlySet<string> = new Set(
    PAYSTACK_REFUND_EVENT_NAMES,
);

export const PAYSTACK_REFUND_TERMINAL_STATUS = {
    'refund.processed': OrderRefundStatus.PROCESSED,
    'refund.failed': OrderRefundStatus.FAILED,
} as const satisfies Record<
    Extract<
        PaystackRefundWebhookEventName,
        'refund.processed' | 'refund.failed'
    >,
    Extract<OrderRefundStatus, 'PROCESSED' | 'FAILED'>
>;

export type PaystackRefundTerminalWebhookEventName =
    keyof typeof PAYSTACK_REFUND_TERMINAL_STATUS;

export type PaystackWebhookEvent = {
    event: string;
    data: PaystackWebhookChargeData | PaystackWebhookRefundData;
};

export type PaystackWebhookChargeData = {
    id?: number;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown> | string | null;
};

export type PaystackWebhookRefundData = {
    id?: number;
    status?: string;
    amount?: number | string;
    currency?: string;
    transaction_reference?: string;
    refund_reference?: string | null;
    processor?: string;
    domain?: string;
    integration?: number;
    customer?: {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
    };
};
