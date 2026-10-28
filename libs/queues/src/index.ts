export {
    GENERAL_JOB_OPTIONS,
    GENERAL_JOBS,
    GENERAL_QUEUE,
    MAIL_JOB_OPTIONS,
    MAIL_JOBS,
    MAIL_QUEUE,
    MAIL_TEMPLATES,
    type GeneralJobName,
    type MailJobName,
    type MailTemplate,
} from './queue.constants.js';
export type {
    InventoryStockReminderMailPayload,
    SendMailJobPayload,
} from './mail/index.js';
export { MailQueueService } from './mail/index.js';
export {
    GeneralQueueService,
    type CancelOrderJobPayload,
    type CustomerAccountDeletedJobPayload,
    type ExpiredReservationsJobPayload,
    type ExpirePromotionMarketJobPayload,
    type InventoryStockReminderJobPayload,
    type InventoryStockReminderKind,
    type CustomerRegisteredJobPayload,
    type StaffDeactivatedJobPayload,
} from './general/index.js';
export {
    QUEUES_MODULE_OPTIONS,
    type QueuesModuleAsyncOptions,
    type QueuesModuleOptions,
} from './queues.module-definition.js';
export { QueuesModule } from './queues.module.js';
