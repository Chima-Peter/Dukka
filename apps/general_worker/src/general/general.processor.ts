import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    GENERAL_JOB_OPTIONS,
    GENERAL_QUEUE,
} from '@app/queues';

@Processor(GENERAL_QUEUE, { concurrency: 20 })
export class GeneralProcessor extends WorkerHost {
    private readonly logger = new Logger(GeneralProcessor.name);

    async process(job: Job): Promise<void> {
        this.logger.log(
            `Processing general job id=${job.id} name=${job.name}`,
        );

        switch (job.name) {
            default:
                throw new Error(`Unknown general job name: ${job.name}`);
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.log(
            `General job completed id=${job.id} name=${job.name}`,
        );
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job | undefined, error: Error) {
        const attempt = job?.attemptsMade ?? 0;
        const maxAttempts = job?.opts.attempts ?? GENERAL_JOB_OPTIONS.attempts;
        this.logger.error(
            `General job failed id=${job?.id ?? 'unknown'} name=${job?.name ?? 'unknown'} attempt=${attempt}/${maxAttempts}: ${error.message}`,
            error.stack,
        );
    }
}
