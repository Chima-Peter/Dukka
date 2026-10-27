import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@app/common';
import { QueuesModule } from '@app/queues';
import { ConfigModule } from './config/config.module.js';
import type { ConfigType } from './config/env.interface.js';
import { MailModule } from './mail/mail.module.js';

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
        QueuesModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                url: configService.getOrThrow('REDIS_URL', { infer: true }),
            }),
        }),
        MailModule,
    ],
})
export class AppModule {}
