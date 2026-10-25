import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
    GENERAL_QUEUE,
    type GeneralJobName,
} from '../queue.constants.js';

@Injectable()
export class GeneralQueueService {
    private readonly logger = new Logger(GeneralQueueService.name);

    constructor(
        @InjectQueue(GENERAL_QUEUE) private readonly generalQueue: Queue,
    ) {}

    async enqueue(
        name: GeneralJobName,
        payload: unknown,
    ): Promise<Job> {
        this.logger.log(`Enqueueing general job name=${name}`);

        const job = await this.generalQueue.add(name, payload);

        this.logger.log(`General job enqueued id=${job.id} name=${job.name}`);
        return job;
    }

    async enqueueMany(
        jobs: Array<{ name: GeneralJobName; payload: unknown }>,
    ): Promise<Job[]> {
        if (jobs.length === 0) {
            return [];
        }

        return Promise.all(
            jobs.map(({ name, payload }) => this.enqueue(name, payload)),
        );
    }
}
