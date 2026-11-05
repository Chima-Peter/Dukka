import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketsService } from '../markets/markets.service.js';
import type { ScopedAccessActor } from '../shared/access-control.js';
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
    let warehouseRepository: {
        findByIdOrThrow: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        const { StaffService } = await import('../staff/staff.service.js');
        const { NotificationPublisher } = await import(
            '../../../../libs/common/src/index.ts'
        );

        warehouseRepository = {
            create: vi.fn(),
            findAll: vi.fn(),
            findByIdOrThrow: vi.fn(),
            updateManager: vi.fn(),
            close: vi.fn(),
            open: vi.fn(),
        } as typeof warehouseRepository & Record<string, ReturnType<typeof vi.fn>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WarehouseService,
                {
                    provide: WarehouseRepository,
                    useValue: warehouseRepository,
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

    it('denies warehouse staff closing a sibling warehouse', async () => {
        const warehouseActor: ScopedAccessActor = {
            scopes: [
                {
                    scope_type: 'WAREHOUSE',
                    market_id: null,
                    warehouse_id: 'wh-1',
                    distribution_point_id: null,
                },
            ],
            market_ids: ['market-1'],
        };
        warehouseRepository.findByIdOrThrow.mockResolvedValue({
            id: 'wh-2',
            market_id: 'market-1',
            status: 'OPEN',
            manager_id: 'staff-1',
            name: 'Other',
        });

        await expect(
            service.close('wh-2', warehouseActor),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(warehouseRepository.close).not.toHaveBeenCalled();
    });

    it('allows market staff to close warehouses in assigned markets', async () => {
        const marketActor: ScopedAccessActor = {
            scopes: [
                {
                    scope_type: 'MARKET',
                    market_id: 'market-1',
                    warehouse_id: null,
                    distribution_point_id: null,
                },
            ],
            market_ids: ['market-1'],
        };
        warehouseRepository.findByIdOrThrow.mockResolvedValue({
            id: 'wh-2',
            market_id: 'market-1',
            status: 'OPEN',
            manager_id: 'staff-1',
            name: 'Other',
        });
        warehouseRepository.close.mockResolvedValue({
            id: 'wh-2',
            market_id: 'market-1',
            status: 'CLOSED',
            manager_id: 'staff-1',
            name: 'Other',
        });

        await service.close('wh-2', marketActor);
        expect(warehouseRepository.close).toHaveBeenCalledWith('wh-2');
    });
});
