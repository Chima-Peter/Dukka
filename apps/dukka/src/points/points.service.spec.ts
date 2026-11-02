import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationPublisher } from '../../../../libs/common/src/notifications/notification-publisher.service.js';
import { PointsRepository } from './points.repository.js';
import { PointsService } from './points.service.js';

describe('PointsService', () => {
    let service: PointsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PointsService,
                {
                    provide: PointsRepository,
                    useValue: {
                        findHistory: vi.fn(),
                        findBalance: vi.fn(),
                        earn: vi.fn(),
                        redeem: vi.fn(),
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

        service = module.get<PointsService>(PointsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
