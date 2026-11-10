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
        findByIdWithAuditRelationsOrThrow: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
        assignStaff: ReturnType<typeof vi.fn>;
    };
    let staffService: {
        validateIds: ReturnType<typeof vi.fn>;
    };
    let notificationPublisher: {
        notifyStaff: ReturnType<typeof vi.fn>;
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
            findByIdWithAuditRelationsOrThrow: vi.fn(),
            updateManager: vi.fn(),
            close: vi.fn(),
            open: vi.fn(),
            assignStaff: vi.fn(),
        } as typeof warehouseRepository & Record<string, ReturnType<typeof vi.fn>>;
        staffService = {
            validateIds: vi.fn(),
        };
        notificationPublisher = {
            notifyStaff: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WarehouseService,
                {
                    provide: WarehouseRepository,
                    useValue: warehouseRepository,
                },
                {
                    provide: StaffService,
                    useValue: staffService,
                },
                {
                    provide: MarketsService,
                    useValue: {
                        requireOpenMarket: vi.fn(),
                    },
                },
                {
                    provide: NotificationPublisher,
                    useValue: notificationPublisher,
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

    it('assigns warehouse-scoped staff to a warehouse', async () => {
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
        warehouseRepository.findByIdWithAuditRelationsOrThrow.mockResolvedValue({
            id: 'wh-1',
            market_id: 'market-1',
            status: 'OPEN',
            manager_id: 'manager-1',
            name: 'Lagos Hub',
            market: { id: 'market-1', name: 'Nigeria' },
            manager: { id: 'manager-1', name: 'Manager' },
        });
        staffService.validateIds.mockResolvedValue({
            valid: true,
            staff: {
                'staff-2': {
                    id: 'staff-2',
                    name: 'Worker',
                    exists: true,
                    is_active: true,
                    has_permissions: true,
                    has_scope: true,
                    valid: true,
                },
            },
        });
        warehouseRepository.assignStaff.mockResolvedValue([
            {
                id: 'scope-1',
                staff_id: 'staff-2',
                warehouse_id: 'wh-1',
                created_at: new Date(),
                staff: {
                    id: 'staff-2',
                    name: 'Worker',
                    email: 'worker@dukka.local',
                    is_active: true,
                },
            },
        ]);

        const result = await service.assignStaff(
            'wh-1',
            { staff_ids: ['staff-2'] },
            marketActor,
            { id: 'actor-1', name: 'Actor' },
        );

        expect(warehouseRepository.assignStaff).toHaveBeenCalledWith(
            'wh-1',
            [{ id: 'staff-2', name: 'Worker' }],
            { id: 'actor-1', name: 'Actor' },
            { id: 'market-1', name: 'Nigeria' },
        );
        expect(notificationPublisher.notifyStaff).toHaveBeenCalledWith(
            'staff-2',
            expect.objectContaining({
                title: 'Warehouse assigned',
            }),
        );
        expect(result).toHaveLength(1);
    });
});
