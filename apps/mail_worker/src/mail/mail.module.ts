import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    MailModule as NestMailModule,
    SmtpTransport,
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
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                const user = configService.get('SMTP_USER', { infer: true });
                const pass = configService.get('SMTP_PASS', { infer: true });

                return {
                    transport: new SmtpTransport({
                        host: configService.getOrThrow('SMTP_HOST', {
                            infer: true,
                        }),
                        port: configService.getOrThrow('SMTP_PORT', {
                            infer: true,
                        }),
                        secure: configService.getOrThrow('SMTP_SECURE', {
                            infer: true,
                        }),
                        ...(user
                            ? {
                                  auth: {
                                      user,
                                      pass: pass ?? '',
                                  },
                              }
                            : {}),
                        pool: true,
                    }),
                    from: configService.getOrThrow('MAIL_FROM', {
                        infer: true,
                    }),
                };
            },
        }),
    ],
    providers: [MailService, MailProcessor],
})
export class MailModule {}
