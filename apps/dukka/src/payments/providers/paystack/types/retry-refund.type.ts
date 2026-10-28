import type { CreateRefundResult } from './create-refund.type.js';

export type RetryRefundAccountDetails = {
    currency: string;
    account_number: string;
    bank_id: string;
};

export type RetryRefundInput = {
    id: string | number;
    refund_account_details: RetryRefundAccountDetails;
};

export type RetryRefundResult = CreateRefundResult & {
    reason?: string | null;
    customer?: unknown;
    initiated_by?: string | null;
    reversed_at?: string | null;
    session_id?: string | null;
    dispute?: unknown;
    settlement?: unknown;
};
