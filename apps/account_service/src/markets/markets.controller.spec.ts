import { Test, TestingModule } from '@nestjs/testing';
import { MarketsController } from './markets.controller.js';
import { MarketsService } from './markets.service.js';

describe('MarketsController', () => {
    let controller: MarketsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MarketsController],
            providers: [
                {
                    provide: MarketsService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<MarketsController>(MarketsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
