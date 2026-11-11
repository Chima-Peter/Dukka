import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationPublisher } from '@app/common';
import { GeneralQueueService } from '@app/queues';
import { ShipmentsRepository } from './shipments.repository.js';
import { ShipmentsService } from './shipments.service.js';

describe('ShipmentsService', () => {
    let service: ShipmentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShipmentsService,
                {
                    provide: ShipmentsRepository,
                    useValue: {
                        findForMoveOrThrow: vi.fn(),
                        findLocationOrThrow: vi.fn(),
                        findActivePartnerOrThrow: vi.fn(),
                        findDetailByTrackingNumber: vi.fn(),
                        move: vi.fn(),
                        findStaffIdsForLocation: vi.fn(),
                    },
                },
                {
                    provide: GeneralQueueService,
                    useValue: {
                        enqueue: vi.fn(),
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

        service = module.get<ShipmentsService>(ShipmentsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
