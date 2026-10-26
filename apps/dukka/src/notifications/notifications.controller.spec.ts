import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsController', () => {
    let controller: NotificationsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationsController],
            providers: [
                {
                    provide: NotificationsService,
                    useValue: {
                        streamForCustomer: vi.fn(),
                        streamForStaff: vi.fn(),
                        findForCustomer: vi.fn(),
                        findForStaff: vi.fn(),
                        markReadForCustomer: vi.fn(),
                        markReadForStaff: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<NotificationsController>(
            NotificationsController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
