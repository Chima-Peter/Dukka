import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
    GENERAL_QUEUE,
    type GeneralJobName,
} from '../queue.constants.js';
import type { EnqueueGeneralJobInput } from './general-queue.types.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class GeneralQueueService {
    private readonly logger = new Logger(GeneralQueueService.name);

    constructor(
        @InjectQueue(GENERAL_QUEUE) private readonly generalQueue: Queue,
    ) {}

    async enqueue(
        name: GeneralJobName,
        payload: unknown,
        options?: { jobId?: string },
    ): Promise<Job> {
        const jobId = options?.jobId;

        this.logger.log(
            `Enqueueing general job name=${name}${jobId ? ` jobId=${jobId}` : ''}`,
        );

        const job = await this.generalQueue.add(
            name,
            payload,
            jobId ? { jobId } : { jobId: randomUUID().toString() },
        );

        this.logger.log(`General job enqueued id=${job.id} name=${job.name}`);
        return job;
    }

    async enqueueMany(jobs: EnqueueGeneralJobInput[]): Promise<Job[]> {
        if (jobs.length === 0) {
            return [];
        }

        return Promise.all(
            jobs.map(({ name, payload, jobId }) =>
                this.enqueue(name, payload, jobId ? { jobId } : undefined),
            ),
        );
    }
}
