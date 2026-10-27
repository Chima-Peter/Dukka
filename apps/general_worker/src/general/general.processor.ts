import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    GENERAL_JOB_OPTIONS,
    GENERAL_JOBS,
    GENERAL_QUEUE,
    type ExpiredReservationsJobPayload,
    type InventoryStockReminderJobPayload,
    type OrderMatchingJobPayload,
} from '@app/queues';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';
import { InventoryStockReminderService } from './handlers/inventory-stock-reminder.service.js';
import { OrderMatchingService } from './handlers/order-matching.service.js';

@Processor(GENERAL_QUEUE, { concurrency: 20 })
export class GeneralProcessor extends WorkerHost {
    private readonly logger = new Logger(GeneralProcessor.name);

    constructor(
        private readonly expiredReservationsService: ExpiredReservationsService,
        private readonly orderMatchingService: OrderMatchingService,
        private readonly inventoryStockReminderService: InventoryStockReminderService,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log(
            `Processing general job id=${job.id} name=${job.name}`,
        );

        switch (job.name) {
            case GENERAL_JOBS.EXPIRED_RESERVATIONS:
                await this.expiredReservationsService.process(
                    job.data as ExpiredReservationsJobPayload,
                );
                return;
            case GENERAL_JOBS.ORDER_MATCHING:
                await this.orderMatchingService.process(
                    job.data as OrderMatchingJobPayload,
                );
                return;
            case GENERAL_JOBS.INVENTORY_STOCK_REMINDER:
                await this.inventoryStockReminderService.process(
                    job.data as InventoryStockReminderJobPayload,
                );
                return;
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
