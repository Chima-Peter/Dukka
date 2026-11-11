export {
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
    STAFF_ACCESS_TOKEN_TTL_SECONDS,
    STAFF_REFRESH_TOKEN_TTL_SECONDS,
} from '@app/common';

export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 5 * 60;
export const PASSWORD_RESET_VERIFIED_TTL_SECONDS = 1 * 60;
export const ACCOUNT_DELETION_TOKEN_TTL_SECONDS = 5 * 60;
export const ORDER_IDEMPOTENCY_PROCESSING_TTL_SECONDS = 15 * 60;
export const ORDER_IDEMPOTENCY_COMPLETED_TTL_SECONDS = 24 * 60 * 60;
export const ORDER_IDEMPOTENCY_KEY_MAX_LENGTH = 128;
export const CATEGORIES_LIST_TTL_SECONDS = 60 * 60;
export const CATEGORIES_LIST_LOCK_TTL_MS = 10 * 1000;
export const CATEGORIES_LIST_LOCK_RETRY_MS = 100;
export const PRODUCT_SUGGESTIONS_TTL_SECONDS = 15 * 60;
export const PRODUCT_SUGGESTIONS_LOCK_TTL_MS = 10 * 1000;
export const PRODUCT_SUGGESTIONS_LOCK_RETRY_MS = 100;

export const RedisKeys = {
    passwordResetToken: (email: string) => `password_reset:token:${email}`,
    passwordResetVerified: (email: string) =>
        `password_reset:verified:${email}`,
    staffPasswordResetToken: (email: string) =>
        `staff_password_reset:token:${email}`,
    staffPasswordResetVerified: (email: string) =>
        `staff_password_reset:verified:${email}`,
    accountDeletionToken: (email: string) => `account_deletion:token:${email}`,
    blacklistedToken: (token: string) => `blacklisted:token:${token}`,
    customerActiveMarket: (customerId: string) =>
        `customer:active_market:${customerId}`,
    orderIdempotency: (key: string) => `order:idempotency:${key}`,
    orderIdempotencyLock: (key: string) => `order:idempotency:lock:${key}`,
    orderPaystackPayIdempotency: (key: string) =>
        `order:paystack_pay:idempotency:${key}`,
    orderPaystackPayIdempotencyLock: (key: string) =>
        `order:paystack_pay:idempotency:lock:${key}`,
    categoriesListVersion: (marketId: string) =>
        `categories:list:version:${marketId}`,
    categoriesListLock: (
        marketId: string,
        cursor: string | undefined,
        limit: number,
    ) => `categories:list:lock:${marketId}:${cursor ?? '_'}:${limit}`,
    categoriesListPrefix: (marketId: string) =>
        `categories:list:${marketId}:`,
    categoriesListSuffix: (cursor: string | undefined, limit: number) =>
        `:${cursor ?? '_'}:${limit}`,
    productSuggestionsVersion: (marketId: string) =>
        `products:suggestions:version:${marketId}`,
    productSuggestionsLock: (marketId: string, q: string, limit: number) =>
        `products:suggestions:lock:${marketId}:${q}:${limit}`,
    productSuggestionsPrefix: (marketId: string) =>
        `products:suggestions:${marketId}:`,
    productSuggestionsSuffix: (q: string, limit: number) => `:${q}:${limit}`,
} as const;
