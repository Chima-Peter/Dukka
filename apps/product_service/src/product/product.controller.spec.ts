import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
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

describe('ProductController', () => {
    let controller: ProductController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductController],
            providers: [
                {
                    provide: ProductService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findAllForStaff: vi.fn(),
                        findOne: vi.fn(),
                        findOneForStaff: vi.fn(),
                        update: vi.fn(),
                        updateVariant: vi.fn(),
                        addToMarket: vi.fn(),
                        setMarketPrice: vi.fn(),
                        getMarketPrice: vi.fn(),
                        approve: vi.fn(),
                        reject: vi.fn(),
                        archive: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ProductController>(ProductController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
