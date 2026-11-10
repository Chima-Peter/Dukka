import { Test, TestingModule } from '@nestjs/testing';
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
                        move: jest.fn(),
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
