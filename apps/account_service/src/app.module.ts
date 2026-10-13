import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import {
  AllExceptionsFilter,
  RedisModule,
  TransformResponseInterceptor,
} from '@app/common';
import { AuthenticationModule } from './authentication/authentication.module.js';
import { ConfigModule } from './config/config.module.js';
import type { ConfigType } from './config/env.interface.js';
import { CustomerModule } from './customer/customer.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppController } from './app.controller.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule,
    PrismaModule,
    CustomerModule,
    AuthenticationModule,
    RedisModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigType, true>) => ({
        url: configService.getOrThrow('REDIS_URL', { infer: true }),
      }),
    }),
    ObserveModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ConfigType, true>) => {
        return {
          appKey: configService.getOrThrow('OBSERVE_APP_KEY', { infer: true }),
          appSecret: configService.getOrThrow('OBSERVE_APP_SECRET', {
            infer: true,
          }),
          serviceId: configService.getOrThrow('OBSERVE_SERVICE_NAME', {
            infer: true,
          }),
          outgoing: {
            database: true,
            http: {
              propagateTraceId: (url) => url.includes('api/v1'),
            },
          },
          http: {
            tags: {
              env: configService.getOrThrow('NODE_ENV', { infer: true }),
            },
            capture: {
              slowerThanMs: 3000,
              body: true,
            },
            //ignore: ['/health'],
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
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
