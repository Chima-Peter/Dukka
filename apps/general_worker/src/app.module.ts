import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule, RedisModule, SupabaseModule } from '@app/common';
import { QueuesModule } from '@app/queues';
import { ConfigModule } from './config/config.module.js';
import type { ConfigType } from './config/env.interface.js';
import { GeneralModule } from './general/general.module.js';

@Module({
    imports: [
        ConfigModule,
        PrismaModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                databaseUrl: configService.getOrThrow('DATABASE_URL', {
                    infer: true,
                }),
            }),
        }),
        RedisModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                url: configService.getOrThrow('REDIS_URL', { infer: true }),
            }),
        }),
        QueuesModule.registerAsync({
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
        GeneralModule,
    ],
})
export class AppModule {}
