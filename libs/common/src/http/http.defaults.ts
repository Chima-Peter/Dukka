import type { Duration, HttpRetryOptions } from '@nestjs/http-client';
import type { HttpClientModuleOptions } from './http.module-definition.js';

/** Per-attempt timeout applied as the application-wide default. */
export const DEFAULT_HTTP_TIMEOUT: Duration = '10s';

/** Retry policy for idempotent methods (merged field-by-field by the client). */
export const DEFAULT_HTTP_RETRY: HttpRetryOptions = {
    attempts: 3,
    backoff: {
        delay: '200ms',
        factor: 2,
        maxDelay: '30s',
        jitter: 'full',
    },
    methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
    statusCodes: [408, 429, 500, 502, 503, 504],
};

function mergeRetry(
    retry: HttpClientModuleOptions['retry'],
): HttpClientModuleOptions['retry'] {
    if (retry === false || typeof retry === 'number') {
        return retry;
    }

    return {
        ...DEFAULT_HTTP_RETRY,
        ...(typeof retry === 'object' ? retry : {}),
    };
}

export function mergeHttpClientDefaults(
    options: HttpClientModuleOptions = {},
): HttpClientModuleOptions {
    const { timeout, retry, ...rest } = options;

    return {
        ...rest,
        timeout: timeout ?? DEFAULT_HTTP_TIMEOUT,
        retry: mergeRetry(retry),
    };
}
