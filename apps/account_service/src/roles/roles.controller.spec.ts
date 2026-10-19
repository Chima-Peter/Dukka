import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
    CurrentStaff: () => () => undefined,
    RequirePermission: () => () => undefined,
    ResponseMessage: () => () => undefined,
    StaffPermission: new Proxy(
        {},
        {
            get: (_target, property) => String(property),
        },
    ),
}));

describe('RolesController', () => {
    let controller: RolesController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RolesController],
            providers: [
                {
                    provide: RolesService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                        hasPermission: vi.fn(),
                        assignPermissions: vi.fn(),
                        removePermissions: vi.fn(),
                        assignMarkets: vi.fn(),
                        removeMarkets: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<RolesController>(RolesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
