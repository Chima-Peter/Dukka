import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    MAIL_JOB_OPTIONS,
    MAIL_JOBS,
    MAIL_QUEUE,
    type InventoryStockReminderMailPayload,
    type SendMailJobPayload,
} from '@app/queues';
import { InventoryStockReminderMailService } from './handlers/inventory-stock-reminder.service.js';
import { MailService } from './handlers/mail.service.js';

@Processor(MAIL_QUEUE, { concurrency: 20 })
export class MailProcessor extends WorkerHost {
    private readonly logger = new Logger(MailProcessor.name);

    constructor(
        private readonly mailService: MailService,
        private readonly inventoryStockReminderMailService: InventoryStockReminderMailService,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log(
            `Processing mail job id=${job.id} name=${job.name}`,
        );

        switch (job.name) {
            case MAIL_JOBS.SEND: {
                const data = job.data as SendMailJobPayload;
                await this.mailService.send(data, {
                    idempotencyKey: job.id ? `mail:${job.id}` : undefined,
                });
                return;
            }
            case MAIL_JOBS.INVENTORY_STOCK_REMINDER:
                await this.inventoryStockReminderMailService.process(
                    job.data as InventoryStockReminderMailPayload,
                    {
                        idempotencyKey: job.id
                            ? `mail:${job.id}`
                            : undefined,
                    },
                );
                return;
            default:
                throw new Error(`Unknown mail job name: ${job.name}`);
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.log(`Mail job completed id=${job.id} name=${job.name}`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job | undefined, error: Error) {
        const attempt = job?.attemptsMade ?? 0;
        const maxAttempts = job?.opts.attempts ?? MAIL_JOB_OPTIONS.attempts;
        this.logger.error(
            `Mail job failed id=${job?.id ?? 'unknown'} name=${job?.name ?? 'unknown'} attempt=${attempt}/${maxAttempts}: ${error.message}`,
            error.stack,
        );
    }
}
