import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    ResponseMessage: () => () => undefined,
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
                        update: vi.fn(),
                        delete: vi.fn(),
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
