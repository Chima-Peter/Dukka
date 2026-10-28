import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromotionsRepository } from './promotions.repository.js';
import { PromotionsService } from './promotions.service.js';

describe('PromotionsService', () => {
    let service: PromotionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PromotionsService,
                {
                    provide: PromotionsRepository,
                    useValue: {
                        create: vi.fn(),
                        createDiscount: vi.fn(),
                        findAll: vi.fn(),
                        findAllDiscounts: vi.fn(),
                        addMarket: vi.fn(),
                        findById: vi.fn(),
                        findDiscountById: vi.fn(),
                        update: vi.fn(),
                        updateDiscount: vi.fn(),
                        updateMarket: vi.fn(),
                        findPromotionStatus: vi.fn(),
                        setPromotionStatus: vi.fn(),
                        deactivateWithMarkets: vi.fn(),
                        findPromotionMarket: vi.fn(),
                        setPromotionMarketStatus: vi.fn(),
                        findMarketTargets: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PromotionsService>(PromotionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
