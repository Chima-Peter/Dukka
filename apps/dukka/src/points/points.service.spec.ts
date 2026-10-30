import { Test, TestingModule } from '@nestjs/testing';
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
            ],
        }).compile();

        service = module.get<PointsService>(PointsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
