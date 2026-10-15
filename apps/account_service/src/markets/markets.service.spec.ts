import { Test, TestingModule } from '@nestjs/testing';
import { MarketsRepository } from './markets.repository.js';
import { MarketsService } from './markets.service.js';

describe('MarketsService', () => {
    let service: MarketsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MarketsService,
                {
                    provide: MarketsRepository,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findById: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MarketsService>(MarketsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
