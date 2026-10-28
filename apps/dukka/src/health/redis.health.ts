import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
    HealthIndicatorService,
    type HealthCheckAttempt,
} from '@nestjs/terminus';
import { RedisService } from '@app/common';
import { GENERAL_QUEUE, MAIL_QUEUE } from '@app/queues';
import { RedisQueueBackend, type Queue } from 'bullmq';

@Injectable()
export class RedisHealthIndicator {
    constructor(
        private readonly healthIndicatorService: HealthIndicatorService,
        private readonly redisService: RedisService,
        @InjectQueue(GENERAL_QUEUE) private readonly generalQueue: Queue,
        @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    ) {}

    ping(key: string): HealthCheckAttempt {
        return this.healthIndicatorService
            .check(key)
            .attempt(async () => {
                await this.redisService.ping();
            });
    }

    pingGeneralQueue(key: string): HealthCheckAttempt {
        return this.pingQueue(key, this.generalQueue);
    }

    pingMailQueue(key: string): HealthCheckAttempt {
        return this.pingQueue(key, this.mailQueue);
    }

    private pingQueue(key: string, queue: Queue): HealthCheckAttempt {
        return this.healthIndicatorService
            .check(key)
            .attempt(async () => {
                await queue.waitUntilReady();
                const backend = queue.getBackend();
                if (!(backend instanceof RedisQueueBackend)) {
                    throw new Error('Queue backend is not Redis');
                }
                await (await backend.client).info();
            });
    }
}
