import { Test, TestingModule } from '@nestjs/testing';
import { RolesRepository } from './roles.repository.js';
import { RolesService } from './roles.service.js';

describe('RolesService', () => {
    let service: RolesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                {
                    provide: RolesRepository,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findById: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
