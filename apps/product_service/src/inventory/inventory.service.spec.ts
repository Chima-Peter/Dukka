import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from '../product/product.repository.js';
import { WarehouseRepository } from '../warehouse/warehouse.repository.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';

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
                        findProductMarketVariantIds: vi.fn(),
                        sumAvailableByMarketVariantIds: vi.fn(),
                        findByVariantId: vi.fn(),
                        findByProductId: vi.fn(),
                        reserveItems: vi.fn(),
                    },
                },
                {
                    provide: ProductRepository,
                    useValue: {
                        findByIdOrThrow: vi.fn(),
                        findMarketVariantByIdOrThrow: vi.fn(),
                        findMarketVariantsByIds: vi.fn(),
                        findVariantByIdOrThrow: vi.fn(),
                    },
                },
                {
                    provide: WarehouseRepository,
                    useValue: {
                        findByIdOrThrow: vi.fn(),
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
