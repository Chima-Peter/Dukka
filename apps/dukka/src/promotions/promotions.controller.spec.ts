import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';

vi.mock('./promotions.service.js', () => ({
    PromotionsService: class PromotionsService {},
}));

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('../../../../libs/common/src/index.ts')
    >();
    return {
        ...actual,
        Auth: () => () => undefined,
        RequirePermission: () => () => undefined,
        ResponseMessage: () => () => undefined,
        StaffPermission: new Proxy(
            {},
            {
                get: (_target, property) => String(property),
            },
        ),
    };
});

describe('PromotionsController', () => {
    let controller: PromotionsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PromotionsController],
            providers: [
                {
                    provide: PromotionsService,
                    useValue: {
                        create: vi.fn(),
                        createDiscount: vi.fn(),
                        findAll: vi.fn(),
                        findAllDiscounts: vi.fn(),
                        addMarket: vi.fn(),
                        update: vi.fn(),
                        updateDiscount: vi.fn(),
                        updateMarket: vi.fn(),
                        activate: vi.fn(),
                        deactivate: vi.fn(),
                        activateMarket: vi.fn(),
                        deactivateMarket: vi.fn(),
                        findOne: vi.fn(),
                        findMarketTargets: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<PromotionsController>(PromotionsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
