import type { CreateRefundResult } from './create-refund.type.js';

export type ListRefundsInput = {
    transaction: string;
    currency: string;
    from?: string;
    to?: string;
    perPage?: number;
    page?: number;
};

export type ListRefundsResult = CreateRefundResult[];
