import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    EXPIRED_RESERVATIONS_EVERY_MS,
    GENERAL_JOBS,
    GENERAL_QUEUE,
} from '@app/queues';

@Injectable()
export class GeneralScheduler implements OnModuleInit {
    private readonly logger = new Logger(GeneralScheduler.name);

    constructor(
        @InjectQueue(GENERAL_QUEUE) private readonly generalQueue: Queue,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.generalQueue.upsertJobScheduler(
            GENERAL_JOBS.EXPIRED_RESERVATIONS,
            { every: EXPIRED_RESERVATIONS_EVERY_MS },
            {
                name: GENERAL_JOBS.EXPIRED_RESERVATIONS,
                data: {},
                opts: {
                    removeOnComplete: true,
                    removeOnFail: { count: 100 },
                },
            },
        );

        this.logger.log(
            `Scheduled ${GENERAL_JOBS.EXPIRED_RESERVATIONS} every ${EXPIRED_RESERVATIONS_EVERY_MS}ms`,
        );
    }
}
