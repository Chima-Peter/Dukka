import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RedisService, STAFF_JWT_SERVICE } from '@app/common';
import { PasswordHasher } from '../shared/index.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffService } from './staff.service.js';
import { StaffTokenRepository } from './token.repository.js';

describe('StaffAuthService', () => {
    let service: StaffAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaffAuthService,
                {
                    provide: StaffService,
                    useValue: {
                        findByEmail: vi.fn(),
                        findOne: vi.fn(),
                        updatePassword: vi.fn(),
                        changePassword: vi.fn(),
                    },
                },
                {
                    provide: STAFF_JWT_SERVICE,
                    useValue: {
                        signAsync: vi.fn(),
                        decode: vi.fn(),
                    } satisfies Partial<JwtService>,
                },
                {
                    provide: PasswordHasher,
                    useValue: {
                        hash: vi.fn(),
                        verify: vi.fn(),
                    },
                },
                {
                    provide: RedisService,
                    useValue: {
                        set: vi.fn(),
                        get: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: StaffTokenRepository,
                    useValue: {
                        create: vi.fn(),
                        findAllByStaffId: vi.fn(),
                        findByToken: vi.fn(),
                        deleteByToken: vi.fn(),
                        deleteAllByStaffId: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<StaffAuthService>(StaffAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
