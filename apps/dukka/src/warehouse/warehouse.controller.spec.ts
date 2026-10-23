import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarehouseController } from './warehouse.controller.js';

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

vi.mock('./warehouse.service.js', () => ({
    WarehouseService: class WarehouseService {},
}));

describe('WarehouseController', () => {
    let controller: WarehouseController;

    beforeEach(async () => {
        const { WarehouseService } = await import('./warehouse.service.js');

        const module: TestingModule = await Test.createTestingModule({
            controllers: [WarehouseController],
            providers: [
                {
                    provide: WarehouseService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        update: vi.fn(),
                        updateManager: vi.fn(),
                        close: vi.fn(),
                        open: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<WarehouseController>(WarehouseController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
