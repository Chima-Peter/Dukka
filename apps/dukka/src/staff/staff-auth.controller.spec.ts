import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommonMock } from './test/common.mock.js';
import { StaffAuthController } from './staff-auth.controller.js';
import { StaffAuthService } from './staff-auth.service.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) =>
    createCommonMock(importOriginal),
);

describe('StaffAuthController', () => {
    let controller: StaffAuthController;
    let staffAuthService: {
        login: ReturnType<typeof vi.fn>;
        refresh: ReturnType<typeof vi.fn>;
        logout: ReturnType<typeof vi.fn>;
        initiatePasswordReset: ReturnType<typeof vi.fn>;
        verifyPasswordReset: ReturnType<typeof vi.fn>;
        resetPassword: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        staffAuthService = {
            login: vi.fn(),
            refresh: vi.fn(),
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
            accessToken: 'access',
            refreshToken: 'refresh',
            staff: { id: 'staff-1' },
        });

        await expect(
            controller.login({
                email: 'staff@example.com',
                password: 'password',
            }),
        ).resolves.toEqual({
            accessToken: 'access',
            refreshToken: 'refresh',
            staff: { id: 'staff-1' },
        });
    });
});
