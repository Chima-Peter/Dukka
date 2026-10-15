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
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findById: vi.fn(),
                        exists: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                        createProfile: vi.fn(),
                        findProfileByStaffId: vi.fn(),
                        updateProfile: vi.fn(),
                        deleteProfile: vi.fn(),
                        createQualification: vi.fn(),
                        findQualificationsByStaffId: vi.fn(),
                        findQualificationById: vi.fn(),
                        updateQualification: vi.fn(),
                        deleteQualification: vi.fn(),
                    },
                },
                {
                    provide: PasswordHasher,
                    useValue: {
                        hash: vi.fn(),
                        verify: vi.fn(),
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
