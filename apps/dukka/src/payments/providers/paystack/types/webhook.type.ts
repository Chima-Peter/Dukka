export type PaystackWebhookEvent = {
    event: string;
    data: PaystackWebhookChargeData;
};

export type PaystackWebhookChargeData = {
    id?: number;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown> | string | null;
};
