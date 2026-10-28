import type { VerifyTransactionResult } from './verify-transaction.type.js';

export type ListTransactionsInput = {
    perPage?: number;
    page?: number;
    status?: 'failed' | 'success' | 'abandoned';
    from?: string;
    to?: string;
    amount?: number;
};

export type ListTransactionsResult = VerifyTransactionResult[];
