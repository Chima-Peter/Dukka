import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commonMock } from './test/common.mock.js';
import { StaffAuthController } from './staff-auth.controller.js';
import { StaffAuthService } from './staff-auth.service.js';

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

describe('StaffAuthController', () => {
    let controller: StaffAuthController;
    let staffAuthService: {
        login: ReturnType<typeof vi.fn>;
        logout: ReturnType<typeof vi.fn>;
        initiatePasswordReset: ReturnType<typeof vi.fn>;
        verifyPasswordReset: ReturnType<typeof vi.fn>;
        resetPassword: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        staffAuthService = {
            login: vi.fn(),
            logout: vi.fn(),
            initiatePasswordReset: vi.fn(),
            verifyPasswordReset: vi.fn(),
            resetPassword: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffAuthController],
            providers: [
                {
                    provide: StaffAuthService,
                    useValue: staffAuthService,
                },
            ],
        }).compile();

        controller = module.get<StaffAuthController>(StaffAuthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('logs in staff', async () => {
        staffAuthService.login.mockResolvedValue({
            accessToken: 'token',
            staff: { id: 'staff-1' },
        });

        await expect(
            controller.login({
                email: 'staff@example.com',
                password: 'password',
            }),
        ).resolves.toEqual({
            accessToken: 'token',
            staff: { id: 'staff-1' },
        });
    });
});
