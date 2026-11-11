import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    MAIL_QUEUE: 'mail',
    GENERAL_QUEUE: 'general',
    MAIL_JOBS: { SEND: 'send' },
    GENERAL_JOBS: {
        CANCEL_ORDER: 'cancel-order',
        ORDER_PROCESSING: 'order-processing',
        ORDER_AWAITING_PAYMENT: 'order-awaiting-payment',
        ORDER_SHIPPED: 'order-shipped',
    },
    MAIL_TEMPLATES: {},
    QueuesModule: class QueuesModule {},
}));

describe('CheckoutController', () => {
    let controller: CheckoutController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CheckoutController],
            providers: [
                {
                    provide: CheckoutService,
                    useValue: {
                        getPrecheckout: vi.fn(),
                        checkout: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CheckoutController>(CheckoutController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
