import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

describe('StaffController', () => {
    let controller: StaffController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffController],
            providers: [
                {
                    provide: StaffService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        createProfile: jest.fn(),
                        findProfile: jest.fn(),
                        updateProfile: jest.fn(),
                        deleteProfile: jest.fn(),
                        createQualification: jest.fn(),
                        findQualifications: jest.fn(),
                        updateQualification: jest.fn(),
                        deleteQualification: jest.fn(),
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
