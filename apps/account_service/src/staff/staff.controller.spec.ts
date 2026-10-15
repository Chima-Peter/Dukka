import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    ResponseMessage: () => () => undefined,
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

describe('StaffController', () => {
    let controller: StaffController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffController],
            providers: [
                {
                    provide: StaffService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        findAudits: vi.fn(),
                        update: vi.fn(),
                        assignRole: vi.fn(),
                        delete: vi.fn(),
                        getAvatarUploadURL: vi.fn(),
                        getQualificationUploadURL: vi.fn(),
                        createProfile: vi.fn(),
                        findProfile: vi.fn(),
                        updateProfile: vi.fn(),
                        deleteProfile: vi.fn(),
                        createQualification: vi.fn(),
                        findQualifications: vi.fn(),
                        updateQualification: vi.fn(),
                        deleteQualification: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<StaffController>(StaffController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
