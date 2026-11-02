import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    MAIL_QUEUE: 'mail',
    GENERAL_QUEUE: 'general',
    MAIL_JOBS: { SEND: 'send' },
    GENERAL_JOBS: {
        CANCEL_ORDER: 'cancel-order',
        ORDER_PROCESSING: 'order-processing',
    },
    MAIL_TEMPLATES: {},
    QueuesModule: class QueuesModule {},
}));

describe('OrdersService', () => {
    let service: OrdersService;

    beforeEach(async () => {
        const { GeneralQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: OrdersRepository,
                    useValue: {
                        createForCustomer: vi.fn(),
                        createForGuest: vi.fn(),
                        findForCustomer: vi.fn(),
                        findForStaff: vi.fn(),
                        findOneForCustomer: vi.fn(),
                        transitionStatus: vi.fn(),
                    },
                },
                {
                    provide: GeneralQueueService,
                    useValue: {
                        enqueue: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
