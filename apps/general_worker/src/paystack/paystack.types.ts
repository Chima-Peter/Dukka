export type PaystackApiResponse<T> = {
    status: boolean;
    message: string;
    data: T;
};

export type VerifyTransactionResult = {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
};

export type CreateRefundInput = {
    transaction: string | number;
    amount?: number;
    currency?: string;
    customer_note?: string;
    merchant_note?: string;
};

export type CreateRefundResult = {
    id: number;
    status: string;
    amount: number;
    currency: string;
    transaction: number | { id: number; reference: string; amount: number };
};

export type ListRefundsInput = {
    transaction: string;
    currency: string;
    perPage?: number;
    page?: number;
};

export type ListRefundsResult = CreateRefundResult[];
