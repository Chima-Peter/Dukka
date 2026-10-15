import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { StaffRepository } from './staff.repository.js';
import { StaffService } from './staff.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    AVATAR_BUCKET: 'avatar',
    QUALIFICATIONS_BUCKET: 'qualifications',
    MAX_AVATAR_BYTES: 5 * 1024 * 1024,
    MAX_QUALIFICATION_BYTES: 10 * 1024 * 1024,
    ALLOWED_AVATAR_CONTENT_TYPES: new Set([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
    ]),
    ALLOWED_QUALIFICATION_CONTENT_TYPES: new Set([
        'application/pdf',
    ]),
    SupabaseService: class SupabaseService {},
}));

describe('StaffService', () => {
    let service: StaffService;

    beforeEach(async () => {
        const { SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
        );

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
                {
                    provide: SupabaseService,
                    useValue: {
                        createSignedUploadUrl: vi.fn(),
                        createSignedDownloadUrl: vi.fn(),
                        getPublicURL: vi.fn(),
                        getObjectInfo: vi.fn(),
                        deleteFile: vi.fn(),
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
