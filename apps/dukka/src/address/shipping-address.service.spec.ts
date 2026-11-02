import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerService } from '../customer/customer.service.js';
import { ShippingAddressRepository } from './shipping-address.repository.js';
import { ShippingAddressService } from './shipping-address.service.js';

vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    MAIL_QUEUE: 'mail',
    GENERAL_QUEUE: 'general',
    MAIL_JOBS: { SEND: 'send' },
    GENERAL_JOBS: {},
    MAIL_TEMPLATES: {},
    QueuesModule: class QueuesModule {},
}));

describe('ShippingAddressService', () => {
    let service: ShippingAddressService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShippingAddressService,
                {
                    provide: ShippingAddressRepository,
                    useValue: {
                        create: vi.fn(),
                        findAllByCustomerId: vi.fn(),
                        findById: vi.fn(),
                        findByIdAndCustomerId: vi.fn(),
                        findByIdAndEmail: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: CustomerService,
                    useValue: {
                        getActiveMarketId: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ShippingAddressService>(ShippingAddressService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

