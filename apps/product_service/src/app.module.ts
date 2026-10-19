import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { HttpClientModule } from '@nestjs/http-client';
import {
    AllExceptionsFilter,
    CustomerJwtAuthGuard,
    RedisModule,
    StaffJwtAuthGuard,
    StaffPermissionsGuard,
    SupabaseModule,
    TransformResponseInterceptor,
} from '@app/common';
import { AuthModule } from './auth/auth.module.js';
import { ACCOUNT_HTTP_CLIENT } from './shared/account-http.constants.js';
import { AppController } from './app.controller.js';
import { ConfigModule } from './config/config.module.js';
import type { ConfigType } from './config/env.interface.js';
import { PrismaModule } from './prisma/prisma.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    controllers: [AppController],
    imports: [
        ConfigModule,
        PrismaModule,
        HttpClientModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                timeout: '10s',
                headers: {
                    'user-agent': `dukka/${configService.getOrThrow('OBSERVE_SERVICE_NAME', { infer: true })}`,
                },
            }),
        }),
        HttpClientModule.registerAsync({
            name: ACCOUNT_HTTP_CLIENT,
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                const baseUrl = configService
                    .getOrThrow('ACCOUNT_SERVICE_URL', { infer: true })
                    .replace(/\/$/, '');

                return {
                    baseUrl: `${baseUrl}/api/v1/accounts`,
                    retry: false,
                };
            },
        }),
        RedisModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                url: configService.getOrThrow('REDIS_URL', { infer: true }),
            }),
        }),
        AuthModule,
        SupabaseModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                url: configService.getOrThrow('SUPABASE_URL', { infer: true }),
                serviceRoleKey: configService.getOrThrow(
                    'SUPABASE_SERVICE_ROLE_KEY',
                    {
                        infer: true,
                    },
                ),
                buckets: configService
                    .getOrThrow('SUPABASE_BUCKETS', { infer: true })
                    .split(',')
                    .map((bucket) => bucket.trim())
                    .filter(Boolean),
            }),
        }),
        ObserveModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                return {
                    appKey: configService.getOrThrow('OBSERVE_APP_KEY', {
                        infer: true,
                    }),
                    appSecret: configService.getOrThrow('OBSERVE_APP_SECRET', {
                        infer: true,
                    }),
                    serviceId: configService.getOrThrow(
                        'OBSERVE_SERVICE_NAME',
                        {
                            infer: true,
                        },
                    ),
                    outgoing: {
                        database: true,
                        http: {
                            propagateTraceId: (url) => url.includes('api/v1'),
                        },
                    },
                    http: {
                        tags: {
                            env: configService.getOrThrow('NODE_ENV', {
                                infer: true,
                            }),
                        },
                        capture: {
                            slowerThanMs: 3000,
                            body: true,
                        },
                        ignore: ['/health', 'metrics'],
                    },
                    jobs: {
                        setAttributes: (job) => ({
                            queueName: job.queueName,
                            jobName: job.name,
                        }),
                    },
                    runtimeMetrics: true,
                    runtimeMetricsInterval: 300000,
                };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_GUARD,
            useClass: CustomerJwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: StaffJwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: StaffPermissionsGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformResponseInterceptor,
        },
    ],
})
export class AppModule {}
