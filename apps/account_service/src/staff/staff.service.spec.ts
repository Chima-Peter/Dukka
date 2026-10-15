import { Test, TestingModule } from '@nestjs/testing';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { StaffRepository } from './staff.repository.js';
import { StaffService } from './staff.service.js';

describe('StaffService', () => {
    let service: StaffService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaffService,
                {
                    provide: StaffRepository,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findById: jest.fn(),
                        exists: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        createProfile: jest.fn(),
                        findProfileByStaffId: jest.fn(),
                        updateProfile: jest.fn(),
                        deleteProfile: jest.fn(),
                        createQualification: jest.fn(),
                        findQualificationsByStaffId: jest.fn(),
                        findQualificationById: jest.fn(),
                        updateQualification: jest.fn(),
                        deleteQualification: jest.fn(),
                    },
                },
                {
                    provide: PasswordHasher,
                    useValue: {
                        hash: jest.fn(),
                        verify: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<StaffService>(StaffService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
