import { Test, TestingModule } from '@nestjs/testing';
import { StaffAuthController } from './staff-auth.controller.js';
import { StaffAuthService } from './staff-auth.service.js';

describe('StaffAuthController', () => {
    let controller: StaffAuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffAuthController],
            providers: [
                {
                    provide: StaffAuthService,
                    useValue: {
                        login: vi.fn(),
                        logout: vi.fn(),
                        initiatePasswordReset: vi.fn(),
                        verifyPasswordReset: vi.fn(),
                        resetPassword: vi.fn(),
                        changePassword: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<StaffAuthController>(StaffAuthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
