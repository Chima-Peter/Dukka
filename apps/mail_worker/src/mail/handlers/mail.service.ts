import { Injectable, Logger } from '@nestjs/common';
import { Mailer } from '@nestjs/mail';
import type { SendMailJobPayload } from '@app/queues';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly mailer: Mailer) {}

    async send(
        payload: SendMailJobPayload,
        options?: { idempotencyKey?: string },
    ): Promise<void> {
        this.logger.log(
            `Sending mail to=${payload.to} subject=${payload.subject} template=${payload.template ?? 'none'}`,
        );

        if (payload.template) {
            await this.mailer.send({
                to: payload.to,
                subject: payload.subject,
                template: payload.template,
                context: {
                    ...payload.context,
                    subject: payload.subject,
                },
                idempotencyKey: options?.idempotencyKey,
            });
            return;
        }

        if (payload.html) {
            await this.mailer.send({
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
                idempotencyKey: options?.idempotencyKey,
            });
            return;
        }

        throw new Error('Mail job requires a template or html body');
    }
}
