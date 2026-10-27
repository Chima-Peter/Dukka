import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerService } from '../customer/customer.service.js';
import { ProductVariantRepository } from '../product/product-variant.repository.js';
import { ServiceStateService } from '../service/service-state.service.js';
import { WarehouseRepository } from '../warehouse/warehouse.repository.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';

vi.mock('../warehouse/service-state.service.js', () => ({
    ServiceStateService: class ServiceStateService {},
}));

describe('InventoryService', () => {
    let service: InventoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: InventoryRepository,
                    useValue: {
                        create: vi.fn(),
                        updateStock: vi.fn(),
                        findProductAvailability: vi.fn(),
                        findByVariantId: vi.fn(),
                        findByProductId: vi.fn(),
                        findByWarehouseId: vi.fn(),
                        findByMarketVariantId: vi.fn(),
                        findOrderInventoryById: vi.fn(),
                        completeOrderInventory: vi.fn(),
                        reserveItems: vi.fn(),
                    },
                },
                {
                    provide: ProductVariantRepository,
                    useValue: {
                        findMarketVariantByIdOrThrow: vi.fn(),
                    },
                },
                {
                    provide: WarehouseRepository,
                    useValue: {
                        findByIdOrThrow: vi.fn(),
                    },
                },
                {
                    provide: ServiceStateService,
                    useValue: {
                        findWarehouseCoveringState: vi.fn(),
                    },
                },
                {
                    provide: CustomerService,
                    useValue: {
                        getActiveMarketId: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
