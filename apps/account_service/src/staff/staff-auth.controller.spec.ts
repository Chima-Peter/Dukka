import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commonMock } from './test/common.mock.js';
import { StaffAuthController } from './staff-auth.controller.js';
import { StaffAuthService } from './staff-auth.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => commonMock);

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

    it('login delegates to auth service', async () => {
        staffAuthService.login.mockResolvedValue({ accessToken: 'token' });

        await expect(
            controller.login({
                email: 'staff@example.com',
                password: 'Secret123!@#x',
            }),
        ).resolves.toEqual({ accessToken: 'token' });
    });
});
