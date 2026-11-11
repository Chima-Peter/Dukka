import { vi } from 'vitest';
import {
    GENERAL_JOB_OPTIONS,
    GENERAL_JOBS,
    GENERAL_QUEUE,
    MAIL_JOB_OPTIONS,
    MAIL_JOBS,
    MAIL_QUEUE,
    MAIL_TEMPLATES,
} from './libs/queues/src/queue.constants.js';

const queuesMock = {
    GENERAL_JOB_OPTIONS,
    GENERAL_JOBS,
    GENERAL_QUEUE,
    MAIL_JOB_OPTIONS,
    MAIL_JOBS,
    MAIL_QUEUE,
    MAIL_TEMPLATES,
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    QueuesModule: class QueuesModule {},
    QUEUES_MODULE_OPTIONS: 'QUEUES_MODULE_OPTIONS',
};

/**
 * Queue services use Nest parameter decorators that Vite/Rolldown cannot
 * parse during SSR transform. Stub the module globally so specs never load
 * the real implementations (via alias or relative path).
 */
vi.mock('@app/queues', () => queuesMock);
vi.mock('./libs/queues/src/index.ts', () => queuesMock);