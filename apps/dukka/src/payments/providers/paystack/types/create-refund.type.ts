export type CreateRefundInput = {
    /** Transaction reference or id. */
    transaction: string | number;
    /** Amount in subunit; omit for a full refund. */
    amount?: number;
    currency?: string;
    customer_note?: string;
    merchant_note?: string;
};

export type CreateRefundResult = {
    id: number;
    integration: number;
    domain: string;
    transaction: number | { id: number; reference: string; amount: number };
    amount: number;
    deducted_amount: number | null;
    currency: string;
    channel: string | null;
    status: string;
    refunded_by: string;
    refunded_at: string | null;
    expected_at: string | null;
    customer_note: string | null;
    merchant_note: string | null;
    fully_deducted: boolean | number | null;
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    updated_at?: string;
};
