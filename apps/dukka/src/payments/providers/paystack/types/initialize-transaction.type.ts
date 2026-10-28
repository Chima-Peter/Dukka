export type InitializeTransactionInput = {
    email: string;
    /** Amount in the subunit of the currency (e.g. kobo for NGN). */
    amount: number | string;
    currency?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
};

export type InitializeTransactionResult = {
    authorization_url: string;
    access_code: string;
    reference: string;
};
