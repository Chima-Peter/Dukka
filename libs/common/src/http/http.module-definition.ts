import { ConfigurableModuleBuilder } from '@nestjs/common';
import type {
    Duration,
    HttpHeadersInit,
    HttpRetryOptions,
} from '@nestjs/http-client';

/** Application-wide defaults forwarded to Nest's `HttpClientModule.forRoot`. */
export interface HttpClientModuleOptions {
    headers?: HttpHeadersInit;
    timeout?: Duration;
    retry?: number | false | HttpRetryOptions;
    throwOnHttpError?: boolean;
    redirect?: 'follow' | 'error' | 'manual';
    fetch?: typeof globalThis.fetch;
}

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: HTTP_CLIENT_OPTIONS,
    OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<HttpClientModuleOptions>({
    moduleName: 'HttpClient',
})
    .setExtras<{ isGlobal?: boolean }>(
        { isGlobal: false },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal,
        }),
    )
    .build();

export type HttpClientModuleOptionsInput = typeof OPTIONS_TYPE;
export type HttpClientModuleAsyncOptions = typeof ASYNC_OPTIONS_TYPE;
