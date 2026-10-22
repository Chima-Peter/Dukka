import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PointsController } from './points.controller.js';
import { PointsService } from './points.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
    CurrentCustomer: () => () => undefined,
    ResponseMessage: () => () => undefined,
}));

describe('PointsController', () => {
    let controller: PointsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PointsController],
            providers: [
                {
                    provide: PointsService,
                    useValue: {
                        findHistory: vi.fn(),
                        earn: vi.fn(),
                        redeem: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<PointsController>(PointsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
