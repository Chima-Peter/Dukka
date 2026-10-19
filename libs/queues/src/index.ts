export {
    MAIL_JOBS,
    MAIL_QUEUE,
    MAIL_TEMPLATES,
    type MailJobName,
    type MailTemplate,
} from './queue.constants.js';
export type { SendMailJobPayload } from './mail-queue.types.js';
export { MailQueueService } from './mail-queue.service.js';
export {
    QUEUES_MODULE_OPTIONS,
    type QueuesModuleAsyncOptions,
    type QueuesModuleOptions,
} from './queues.module-definition.js';
export { QueuesModule } from './queues.module.js';
