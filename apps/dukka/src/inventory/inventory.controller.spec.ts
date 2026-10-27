import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
    CurrentCustomer: () => () => undefined,
    CurrentStaff: () => () => undefined,
    OptionalCustomerAuth: () => () => undefined,
    Public: () => () => undefined,
    RequirePermission: () => () => undefined,
    ResponseMessage: () => () => undefined,
    StaffPermission: new Proxy(
        {},
        {
            get: (_target, property) => String(property),
        },
    ),
}));

vi.mock('../service/service-state.service.js', () => ({
    ServiceStateService: class ServiceStateService {},
}));

describe('InventoryController', () => {
    let controller: InventoryController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InventoryController],
            providers: [
                {
                    provide: InventoryService,
                    useValue: {
                        create: vi.fn(),
                        updateStock: vi.fn(),
                        checkAvailability: vi.fn(),
                        reserve: vi.fn(),
                        completeOrderInventory: vi.fn(),
                        findByVariant: vi.fn(),
                        findByProduct: vi.fn(),
                        findByWarehouse: vi.fn(),
                        findByMarketVariant: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<InventoryController>(InventoryController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
