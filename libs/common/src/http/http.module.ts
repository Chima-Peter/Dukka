import { type DynamicModule, Module } from '@nestjs/common';
import { HttpClientModule as NestHttpClientModule } from '@nestjs/http-client';
import { mergeHttpClientDefaults } from './http.defaults.js';
import {
    ConfigurableModuleClass,
    HTTP_CLIENT_OPTIONS,
    type HttpClientModuleAsyncOptions,
    type HttpClientModuleOptions,
    type HttpClientModuleOptionsInput,
} from './http.module-definition.js';

/**
 * Global HTTP client defaults (timeout, retries, headers) via
 * `ConfigurableModuleBuilder`. Forwards to Nest's `HttpClientModule.forRootAsync`.
 *
 * Named clients: `HttpClientModule.register({ name: '…' })` from
 * `@nestjs/http-client` (inherits these defaults).
 *
 * @see https://docs.nestjs.com/application/http-client
 */
@Module({})
export class HttpClientModule extends ConfigurableModuleClass {
    static override register(
        options: HttpClientModuleOptionsInput,
    ): DynamicModule {
        return HttpClientModule.withNestDefaults(super.register(options));
    }

    static override registerAsync(
        options: HttpClientModuleAsyncOptions,
    ): DynamicModule {
        return HttpClientModule.withNestDefaults(super.registerAsync(options));
    }

    private static withNestDefaults(dynamicModule: DynamicModule): DynamicModule {
        @Module({})
        class HttpClientOptionsCoreModule {}

        const optionsCore: DynamicModule = {
            module: HttpClientOptionsCoreModule,
            imports: dynamicModule.imports,
            providers: dynamicModule.providers,
            exports: [HTTP_CLIENT_OPTIONS],
        };

        return {
            module: HttpClientModule,
            global: dynamicModule.global,
            imports: [
                optionsCore,
                NestHttpClientModule.forRootAsync({
                    imports: [optionsCore],
                    inject: [HTTP_CLIENT_OPTIONS],
                    useFactory: (options: HttpClientModuleOptions) =>
                        mergeHttpClientDefaults(options ?? {}),
                }),
            ],
            exports: [HTTP_CLIENT_OPTIONS],
        };
    }
}
