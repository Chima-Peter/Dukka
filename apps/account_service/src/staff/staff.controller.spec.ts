import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commonMock } from './test/common.mock.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => commonMock);
vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    MAIL_QUEUE: 'mail',
    MAIL_JOBS: { SEND: 'send' },
    MAIL_TEMPLATES: {
        CUSTOMER_WELCOME: 'customer.welcome',
        CUSTOMER_PASSWORD_RESET: 'customer.password-reset',
        CUSTOMER_PASSWORD_CHANGED: 'customer.password-changed',
        CUSTOMER_ACCOUNT_DELETION: 'customer.account-deletion',
        CUSTOMER_ACCOUNT_DELETED: 'customer.account-deleted',
        STAFF_WELCOME: 'staff.welcome',
        STAFF_INVITATION: 'staff.invitation',
        STAFF_PASSWORD_RESET: 'staff.password-reset',
        STAFF_PASSWORD_CHANGED: 'staff.password-changed',
        STAFF_DEACTIVATED: 'staff.deactivated',
        STAFF_ACCOUNT_UPDATED: 'staff.account-updated',
        STAFF_ROLE_ASSIGNED: 'staff.role-assigned',
        STAFF_ROLE_REVOKED: 'staff.role-revoked',
        STAFF_ROLE_UPDATED: 'staff.role-updated',
        STAFF_PERMISSIONS_CHANGED: 'staff.permissions-changed',
        STAFF_MARKETS_CHANGED: 'staff.markets-changed',
        MARKET_UPDATED: 'market.updated',
        MARKET_DELETED: 'market.deleted',
    },
    QueuesModule: class QueuesModule {},
}));

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
                        validateIds: vi.fn(),
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
                        deleteProfile: vi.fn(),
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
                market_ids: [],
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
                    market_ids: [],
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
