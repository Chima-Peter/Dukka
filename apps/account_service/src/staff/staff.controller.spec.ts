import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commonMock } from './test/common.mock.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => commonMock);

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
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: staffService.findOne,
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

    it('getMe returns the authenticated staff profile', async () => {
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
                market_ids: [],
            }),
        ).resolves.toEqual(profile);
        expect(staffService.findOne).toHaveBeenCalledWith('staff-1');
    });

    it('changePassword delegates to auth service', async () => {
        staffAuthService.changePassword.mockResolvedValue({ data: null });

        await controller.changePassword(
            {
                sub: 'staff-1',
                email: 'staff@example.com',
                type: 'staff',
                name: 'Ada',
                role_id: null,
                role_name: null,
                hierarchy: null,
                market_ids: [],
            },
            {
                currentPassword: 'OldPassword1!',
                newPassword: 'NewPassword1!x',
            },
        );

        expect(staffAuthService.changePassword).toHaveBeenCalledWith(
            'staff-1',
            {
                currentPassword: 'OldPassword1!',
                newPassword: 'NewPassword1!x',
            },
        );
    });
});
