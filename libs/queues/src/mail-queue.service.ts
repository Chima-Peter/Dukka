import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { MAIL_JOBS, MAIL_QUEUE } from './queue.constants.js';
import type { SendMailJobPayload } from './mail-queue.types.js';

@Injectable()
export class MailQueueService {
    private readonly logger = new Logger(MailQueueService.name);

    constructor(
        @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    ) {}

    async enqueueSend(
        payload: SendMailJobPayload,
    ): Promise<Job<SendMailJobPayload>> {
        this.logger.log(
            `Enqueueing mail job to=${payload.to} subject=${payload.subject}`,
        );

        const job = await this.mailQueue.add(MAIL_JOBS.SEND, payload);

        this.logger.log(`Mail job enqueued id=${job.id} name=${job.name}`);
        return job;
    }

    async enqueueSendMany(
        payloads: SendMailJobPayload[],
    ): Promise<Job<SendMailJobPayload>[]> {
        if (payloads.length === 0) {
            return [];
        }

        return Promise.all(
            payloads.map((payload) => this.enqueueSend(payload)),
        );
    }
}
