import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    MailModule as NestMailModule,
    ResendTransport,
} from '@nestjs/mail';
import type { ConfigType } from '../config/env.interface.js';
import { HandlebarsTemplateEngine } from './handlebars-template.engine.js';
import { MailProcessor } from './mail.processor.js';
import { MailService } from './mail.service.js';

@Module({
    imports: [
        NestMailModule.forRootAsync({
            templates: HandlebarsTemplateEngine,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => ({
                transport: new ResendTransport({
                    apiKey: configService.getOrThrow('RESEND_API_KEY', {
                        infer: true,
                    }),
                }),
                from: configService.getOrThrow('MAIL_FROM', { infer: true }),
            }),
        }),
    ],
    providers: [MailService, MailProcessor],
})
export class MailModule {}
