import { Test, TestingModule } from '@nestjs/testing';
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
                        findForMoveOrThrow: jest.fn(),
                        findLocationOrThrow: jest.fn(),
                        findActivePartnerOrThrow: jest.fn(),
                        findDetailByTrackingNumber: jest.fn(),
                        move: jest.fn(),
                        findStaffIdsForLocation: jest.fn(),
                    },
                },
                {
                    provide: GeneralQueueService,
                    useValue: {
                        enqueue: jest.fn(),
                    },
                },
                {
                    provide: NotificationPublisher,
                    useValue: {
                        notifyCustomer: jest.fn(),
                        notifyStaff: jest.fn(),
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
