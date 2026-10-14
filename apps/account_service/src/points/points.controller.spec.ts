import { Test, TestingModule } from '@nestjs/testing';
import { PointsController } from './points.controller.js';
import { PointsRepository } from './points.repository.js';
import { PointsService } from './points.service.js';

describe('PointsController', () => {
    let controller: PointsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PointsController],
            providers: [
                PointsService,
                {
                    provide: PointsRepository,
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
