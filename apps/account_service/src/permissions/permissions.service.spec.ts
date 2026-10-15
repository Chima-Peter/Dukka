import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsService } from './permissions.service.js';

describe('PermissionsService', () => {
    let service: PermissionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                {
                    provide: PermissionsRepository,
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

        service = module.get<PermissionsService>(PermissionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
