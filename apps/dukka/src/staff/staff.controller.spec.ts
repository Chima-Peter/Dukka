import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommonMock } from './test/common.mock.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) =>
    createCommonMock(importOriginal),
);

describe('StaffController', () => {
    let controller: StaffController;
    let staffService: {
        findOne: ReturnType<typeof vi.fn>;
    };
    let staffAuthService: {
        changePassword: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        staffService = {
            findOne: vi.fn(),
        };
        staffAuthService = {
            changePassword: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffController],
            providers: [
                {
                    provide: StaffService,
                    useValue: {
                        findAll: vi.fn(),
                        findOne: staffService.findOne,
                        findAudits: vi.fn(),
                        update: vi.fn(),
                        assignRole: vi.fn(),
                        revokeRole: vi.fn(),
                        delete: vi.fn(),
                        getAvatarUploadURL: vi.fn(),
                        getQualificationUploadURL: vi.fn(),
                        createProfile: vi.fn(),
                        findProfile: vi.fn(),
                        updateProfile: vi.fn(),
                        createQualification: vi.fn(),
                        findQualifications: vi.fn(),
                        findQualification: vi.fn(),
                        updateQualification: vi.fn(),
                        deleteQualification: vi.fn(),
                    },
                },
                {
                    provide: StaffAuthService,
                    useValue: staffAuthService,
                },
            ],
        }).compile();

        controller = module.get<StaffController>(StaffController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('returns the authenticated staff profile', async () => {
        const profile = { id: 'staff-1', email: 'staff@example.com' };
        staffService.findOne.mockResolvedValue(profile);

        await expect(
            controller.getMe({
                sub: 'staff-1',
                email: 'staff@example.com',
                type: 'staff',
                name: 'Ada',
                role_id: null,
                role_name: null,
                hierarchy: null,
                scope_type: null,
                scopes: [],
                market_ids: [],
                permissions: [],
            }),
        ).resolves.toEqual(profile);
        expect(staffService.findOne).toHaveBeenCalledWith('staff-1');
    });

    it('changes password for the authenticated staff', async () => {
        staffAuthService.changePassword.mockResolvedValue({ data: null });

        await expect(
            controller.changePassword(
                {
                    sub: 'staff-1',
                    email: 'staff@example.com',
                    type: 'staff',
                    name: 'Ada',
                    role_id: null,
                    role_name: null,
                    hierarchy: null,
                    scope_type: null,
                    scopes: [],
                    market_ids: [],
                    permissions: [],
                },
                {
                    currentPassword: 'old-password',
                    newPassword: 'NewPassword1!',
                },
            ),
        ).resolves.toEqual({ data: null });
        expect(staffAuthService.changePassword).toHaveBeenCalledWith(
            'staff-1',
            {
                currentPassword: 'old-password',
                newPassword: 'NewPassword1!',
            },
        );
    });
});
