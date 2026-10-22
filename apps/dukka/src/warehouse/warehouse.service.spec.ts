import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';

vi.mock('@app/queues', () => ({
    MAIL_TEMPLATES: {},
    MailQueueService: class MailQueueService {},
}));

vi.mock('../../../../libs/common/src/index.ts', () => ({
    StaffPermission: new Proxy(
        {},
        {
            get: (_target, property) => String(property),
        },
    ),
}));

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

vi.mock('../staff/staff.service.js', () => ({
    StaffService: class StaffService {},
}));

describe('WarehouseService', () => {
    let service: WarehouseService;

    beforeEach(async () => {
        const { MarketsService } = await import(
            '../markets/markets.service.js'
        );
        const { StaffService } = await import('../staff/staff.service.js');

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
                    provide: MarketsService,
                    useValue: {
                        validateIds: vi.fn(),
                    },
                },
                {
                    provide: StaffService,
                    useValue: {
                        validateIds: vi.fn(),
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
