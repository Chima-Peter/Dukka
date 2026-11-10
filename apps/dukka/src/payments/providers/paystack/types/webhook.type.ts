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
