import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { MAIL_JOBS, MAIL_QUEUE } from '../queue.constants.js';
import type {
    EnqueueInventoryStockReminderInput,
    EnqueueSendInput,
    InventoryStockReminderMailPayload,
    SendMailJobPayload,
} from './mail-queue.types.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MailQueueService {
    private readonly logger = new Logger(MailQueueService.name);

    constructor(
        @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    ) {}

    async enqueueSend(
        input: EnqueueSendInput,
    ): Promise<Job<SendMailJobPayload>> {
        const { jobId, ...payload } = input;

        this.logger.log(
            `Enqueueing mail job to=${payload.to} subject=${payload.subject}${jobId ? ` jobId=${jobId}` : ''}`,
        );

        const job = await this.mailQueue.add(
            MAIL_JOBS.SEND,
            payload,
            jobId ? { jobId } : { jobId: randomUUID().toString() },
        );

        this.logger.log(`Mail job enqueued id=${job.id} name=${job.name}`);
        return job;
    }

    async enqueueSendMany(
        payloads: EnqueueSendInput[],
    ): Promise<Job<SendMailJobPayload>[]> {
        if (payloads.length === 0) {
            return [];
        }

        return Promise.all(
            payloads.map((payload) => this.enqueueSend(payload)),
        );
    }

    async enqueueInventoryStockReminder(
        input: EnqueueInventoryStockReminderInput,
    ): Promise<Job<InventoryStockReminderMailPayload>> {
        const { jobId, ...payload } = input;

        this.logger.log(
            `Enqueueing inventory stock reminder mail to=${payload.to} warehouse=${payload.warehouse_id} products=${payload.product_names.length}${jobId ? ` jobId=${jobId}` : ''}`,
        );

        const job = await this.mailQueue.add(
            MAIL_JOBS.INVENTORY_STOCK_REMINDER,
            payload,
            jobId ? { jobId } : { jobId: randomUUID().toString() },
        );

        this.logger.log(`Mail job enqueued id=${job.id} name=${job.name}`);
        return job;
    }
}
