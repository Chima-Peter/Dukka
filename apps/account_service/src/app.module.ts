import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import {
    AllExceptionsFilter,
    JwtAuthGuard,
    RedisModule,
    SupabaseModule,
    TransformResponseInterceptor,
} from '@app/common';
import { ConfigModule } from './config/config.module.js';
import type { ConfigType } from './config/env.interface.js';
import { CustomerModule } from './customer/customer.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ShippingAddressModule } from './shipping_address/shipping_address.module.js';
import { AppController } from './app.controller.js';
import { PointsModule } from './points/points.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    controllers: [AppController],
    imports: [
        ConfigModule,
        PrismaModule,
        CustomerModule,
        ShippingAddressModule,
        RedisModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                url: configService.getOrThrow('REDIS_URL', { infer: true }),
            }),
        }),
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
        PointsModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformResponseInterceptor,
        },
    ],
})
export class AppModule {}
