import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerService } from '../customer/customer.service.js';
import { ProductVariantRepository } from '../product/product-variant.repository.js';
import type { ScopedAccessActor } from '../shared/access-control.js';
import { WarehouseRepository } from '../warehouse/warehouse.repository.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';

vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    MAIL_TEMPLATES: {},
    GENERAL_JOBS: {},
}));

describe('InventoryService', () => {
    let service: InventoryService;
    let inventoryRepository: {
        findByWarehouseId: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        inventoryRepository = {
            create: vi.fn(),
            updateStock: vi.fn(),
            findProductAvailability: vi.fn(),
            findByVariantId: vi.fn(),
            findByProductId: vi.fn(),
            findByWarehouseId: vi.fn(),
            findByMarketVariantId: vi.fn(),
            reserveItems: vi.fn(),
        } as typeof inventoryRepository &
            Record<string, ReturnType<typeof vi.fn>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: InventoryRepository,
                    useValue: inventoryRepository,
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

    it('denies warehouse staff reading sibling warehouse inventory', async () => {
        const warehouseActor: ScopedAccessActor = {
            scopes: [
                {
                    scope_type: 'WAREHOUSE',
                    market_id: null,
                    warehouse_id: 'wh-1',
                    distribution_point_id: null,
                },
            ],
            market_ids: ['market-1'],
        };

        await expect(
            service.findByWarehouse(
                'wh-2',
                { market_id: 'market-1', limit: 20 },
                warehouseActor,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(inventoryRepository.findByWarehouseId).not.toHaveBeenCalled();
    });

    it('allows market staff to read warehouse inventory in assigned markets', async () => {
        const marketActor: ScopedAccessActor = {
            scopes: [
                {
                    scope_type: 'MARKET',
                    market_id: 'market-1',
                    warehouse_id: null,
                    distribution_point_id: null,
                },
            ],
            market_ids: ['market-1'],
        };
        inventoryRepository.findByWarehouseId.mockResolvedValue({
            items: [],
            next_cursor: null,
        });

        await service.findByWarehouse(
            'wh-2',
            { market_id: 'market-1', limit: 20 },
            marketActor,
        );
        expect(inventoryRepository.findByWarehouseId).toHaveBeenCalled();
    });
});
