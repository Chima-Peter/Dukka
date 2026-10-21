import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseService } from './warehouse.service.js';

describe('WarehouseController', () => {
    let controller: WarehouseController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WarehouseController],
            providers: [
                {
                    provide: WarehouseService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
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
