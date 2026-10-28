export type PaystackApiResponse<T> = {
    status: boolean;
    message: string;
    data: T;
    meta?: {
        total?: number;
        skipped?: number;
        perPage?: number;
        page?: number;
        pageCount?: number;
        next?: string | null;
        previous?: string | null;
    };
};
