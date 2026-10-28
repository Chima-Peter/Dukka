import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    GENERAL_JOB_OPTIONS,
    GENERAL_JOBS,
    GENERAL_QUEUE,
    type CancelOrderJobPayload,
    type CustomerAccountDeletedJobPayload,
    type CustomerRegisteredJobPayload,
    type ExpiredReservationsJobPayload,
    type ExpirePromotionMarketJobPayload,
    type InventoryStockReminderJobPayload,
    type StaffDeactivatedJobPayload,
} from '@app/queues';
import { CancelOrderService } from './handlers/cancel-order.service.js';
import { CustomerAccountDeletedService } from './handlers/customer-account-deleted.service.js';
import { CustomerRegisteredService } from './handlers/customer-registered.service.js';
import { ExpirePromotionMarketService } from './handlers/expire-promotion-market.service.js';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';
import { InventoryStockReminderService } from './handlers/inventory-stock-reminder.service.js';
import { StaffDeactivatedService } from './handlers/staff-deactivated.service.js';

@Processor(GENERAL_QUEUE, { concurrency: 20 })
export class GeneralProcessor extends WorkerHost {
    private readonly logger = new Logger(GeneralProcessor.name);

    constructor(
        private readonly expiredReservationsService: ExpiredReservationsService,
        private readonly cancelOrderService: CancelOrderService,
        private readonly customerRegisteredService: CustomerRegisteredService,
        private readonly inventoryStockReminderService: InventoryStockReminderService,
        private readonly customerAccountDeletedService: CustomerAccountDeletedService,
        private readonly staffDeactivatedService: StaffDeactivatedService,
        private readonly expirePromotionMarketService: ExpirePromotionMarketService,
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
            case GENERAL_JOBS.CANCEL_ORDER:
                await this.cancelOrderService.process(
                    job.data as CancelOrderJobPayload,
                );
                return;
            case GENERAL_JOBS.CUSTOMER_REGISTERED:
                await this.customerRegisteredService.process(
                    job.data as CustomerRegisteredJobPayload,
                );
                return;
            case GENERAL_JOBS.INVENTORY_STOCK_REMINDER:
                await this.inventoryStockReminderService.process(
                    job.data as InventoryStockReminderJobPayload,
                );
                return;
            case GENERAL_JOBS.CUSTOMER_ACCOUNT_DELETED:
                await this.customerAccountDeletedService.process(
                    job.data as CustomerAccountDeletedJobPayload,
                );
                return;
            case GENERAL_JOBS.STAFF_DEACTIVATED:
                await this.staffDeactivatedService.process(
                    job.data as StaffDeactivatedJobPayload,
                );
                return;
            case GENERAL_JOBS.EXPIRE_PROMOTION_MARKET:
                await this.expirePromotionMarketService.process(
                    job.data as ExpirePromotionMarketJobPayload,
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
