import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceStateService } from '../service/service-state.service.js';
import type { ScopedAccessActor } from '../shared/access-control.js';
import { DistributionPointsRepository } from './distribution-points.repository.js';
import { DistributionPointsService } from './distribution-points.service.js';

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

vi.mock('../service/service-state.service.js', () => ({
    ServiceStateService: class ServiceStateService {},
}));

describe('DistributionPointsService', () => {
    let service: DistributionPointsService;
    let distributionPointsRepository: {
        findAll: ReturnType<typeof vi.fn>;
        findByIdOrThrow: ReturnType<typeof vi.fn>;
        findByIdWithAuditRelationsOrThrow: ReturnType<typeof vi.fn>;
        findAssignedStaffIds: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
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

        distributionPointsRepository = {
            findAll: vi.fn(),
            findByIdOrThrow: vi.fn(),
            findByIdWithAuditRelationsOrThrow: vi.fn(),
            findAssignedStaffIds: vi.fn(),
            close: vi.fn(),
            assignStaff: vi.fn(),
        };
        staffService = {
            validateIds: vi.fn(),
        };
        notificationPublisher = {
            notifyStaff: vi.fn(),
        };

        const { SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DistributionPointsService,
                {
                    provide: DistributionPointsRepository,
                    useValue: distributionPointsRepository,
                },
                {
                    provide: StaffService,
                    useValue: staffService,
                },
                {
                    provide: ServiceStateService,
                    useValue: {
                        requireOpenInMarket: vi.fn(),
                    },
                },
                {
                    provide: NotificationPublisher,
                    useValue: notificationPublisher,
                },
                {
                    provide: SupabaseService,
                    useValue: {
                        getPublicURL: vi.fn(
                            (path: string) => `https://cdn.example/${path}`,
                        ),
                    },
                },
            ],
        }).compile();

        service = module.get<DistributionPointsService>(
            DistributionPointsService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('lists distribution points in assigned markets for market staff', async () => {
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
        distributionPointsRepository.findAll.mockResolvedValue({
            items: [{ id: 'dp-1', market_id: 'market-1', name: 'Ikeja' }],
            next_cursor: null,
        });

        const result = await service.findAll({}, marketActor);

        expect(distributionPointsRepository.findAll).toHaveBeenCalledWith(
            {},
            { market_ids: ['market-1'] },
        );
        expect(result.items).toHaveLength(1);
    });

    it('denies market staff filtering outside assigned markets', async () => {
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

        await expect(
            service.findAll({ market_id: 'market-2' }, marketActor),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(distributionPointsRepository.findAll).not.toHaveBeenCalled();
    });

    it('denies distribution-point staff closing a sibling point', async () => {
        const dpActor: ScopedAccessActor = {
            scopes: [
                {
                    scope_type: 'DISTRIBUTION_POINT',
                    market_id: null,
                    warehouse_id: null,
                    distribution_point_id: 'dp-1',
                },
            ],
            market_ids: ['market-1'],
        };
        distributionPointsRepository.findByIdOrThrow.mockResolvedValue({
            id: 'dp-2',
            market_id: 'market-1',
            is_active: true,
            name: 'Other',
        });

        await expect(service.close('dp-2', dpActor)).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(distributionPointsRepository.close).not.toHaveBeenCalled();
    });

    it('denies distribution-point staff assigning to a sibling point', async () => {
        const dpActor: ScopedAccessActor = {
            scopes: [
                {
                    scope_type: 'DISTRIBUTION_POINT',
                    market_id: null,
                    warehouse_id: null,
                    distribution_point_id: 'dp-1',
                },
            ],
            market_ids: ['market-1'],
        };
        distributionPointsRepository.findByIdWithAuditRelationsOrThrow.mockResolvedValue(
            {
                id: 'dp-2',
                market_id: 'market-1',
                is_active: true,
                name: 'Other',
                market: { id: 'market-1', name: 'Nigeria' },
            },
        );

        await expect(
            service.assignStaff(
                'dp-2',
                { staff_ids: ['staff-2'] },
                dpActor,
                { id: 'actor-1', name: 'Actor' },
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(
            distributionPointsRepository.assignStaff,
        ).not.toHaveBeenCalled();
    });

    it('assigns distribution-point-scoped staff', async () => {
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
        distributionPointsRepository.findByIdWithAuditRelationsOrThrow.mockResolvedValue(
            {
                id: 'dp-1',
                market_id: 'market-1',
                is_active: true,
                name: 'Ikeja Pickup',
                market: { id: 'market-1', name: 'Nigeria' },
            },
        );
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
        distributionPointsRepository.assignStaff.mockResolvedValue([
            {
                id: 'scope-1',
                staff_id: 'staff-2',
                distribution_point_id: 'dp-1',
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
            'dp-1',
            { staff_ids: ['staff-2'] },
            marketActor,
            { id: 'actor-1', name: 'Actor' },
        );

        expect(distributionPointsRepository.assignStaff).toHaveBeenCalledWith(
            'dp-1',
            [{ id: 'staff-2', name: 'Worker' }],
            { id: 'actor-1', name: 'Actor' },
            { id: 'market-1', name: 'Nigeria' },
        );
        expect(notificationPublisher.notifyStaff).toHaveBeenCalledWith(
            'staff-2',
            expect.objectContaining({
                title: 'Distribution point assigned',
            }),
        );
        expect(result).toHaveLength(1);
    });
});
