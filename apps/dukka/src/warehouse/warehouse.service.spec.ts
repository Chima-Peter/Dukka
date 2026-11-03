import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketsService } from '../markets/markets.service.js';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';

vi.mock('@app/queues', () => ({
    MAIL_TEMPLATES: {},
    MailQueueService: class MailQueueService {},
}));

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('../../../../libs/common/src/index.ts')
        >();
    return {
        ...actual,
        StaffPermission: new Proxy(
            {},
            {
                get: (_target, property) => String(property),
            },
        ),
        NotificationPublisher: class NotificationPublisher {},
    };
});

vi.mock('../staff/staff.service.js', () => ({
    StaffService: class StaffService {},
}));

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

describe('WarehouseService', () => {
    let service: WarehouseService;

    beforeEach(async () => {
        const { StaffService } = await import('../staff/staff.service.js');
        const { NotificationPublisher } = await import(
            '../../../../libs/common/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WarehouseService,
                {
                    provide: WarehouseRepository,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findByIdOrThrow: vi.fn(),
                        updateManager: vi.fn(),
                        close: vi.fn(),
                        open: vi.fn(),
                    },
                },
                {
                    provide: StaffService,
                    useValue: {
                        validateIds: vi.fn(),
                    },
                },
                {
                    provide: MarketsService,
                    useValue: {
                        requireOpenMarket: vi.fn(),
                    },
                },
                {
                    provide: NotificationPublisher,
                    useValue: {
                        notifyCustomer: vi.fn(),
                        notifyStaff: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<WarehouseService>(WarehouseService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
