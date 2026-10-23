import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceCountryService } from '../service/service-country.service.js';
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

vi.mock('../staff/staff.service.js', () => ({
    StaffService: class StaffService {},
}));

vi.mock('../service/service-country.service.js', () => ({
    ServiceCountryService: class ServiceCountryService {},
}));

describe('WarehouseService', () => {
    let service: WarehouseService;

    beforeEach(async () => {
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
                    provide: StaffService,
                    useValue: {
                        validateIds: vi.fn(),
                    },
                },
                {
                    provide: ServiceCountryService,
                    useValue: {
                        findWithMarketStatus: vi.fn(),
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
