import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from './product.repository.js';
import { ProductVariantRepository } from './product-variant.repository.js';
import { ProductVariantService } from './product-variant.service.js';

vi.mock('@app/queues', () => ({
    MAIL_TEMPLATES: {},
    MailQueueService: class MailQueueService {},
}));

vi.mock('../category/category.service.js', () => ({
    CategoryService: class CategoryService {},
}));

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

vi.mock('../../../../libs/common/src/index.ts', () => ({
    PRODUCT_BUCKET: 'products',
    ALLOWED_PRODUCT_CONTENT_TYPES: new Set([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
    ]),
    SupabaseService: class SupabaseService {},
}));

describe('ProductVariantService', () => {
    let service: ProductVariantService;

    beforeEach(async () => {
        const { SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
        );
        const { CategoryService } = await import(
            '../category/category.service.js'
        );
        const { MarketsService } = await import(
            '../markets/markets.service.js'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductVariantService,
                {
                    provide: ProductVariantRepository,
                    useValue: {
                        createVariant: vi.fn(),
                        findVariantInProduct: vi.fn(),
                        findVariantsInProduct: vi.fn(),
                        findPendingUpdateForVariant: vi.fn(),
                        createPendingUpdate: vi.fn(),
                        findPendingUpdatesByIds: vi.fn(),
                        findPendingUpdatesSummary: vi.fn(),
                        findPendingUpdateById: vi.fn(),
                        updatePendingUpdate: vi.fn(),
                        approvePendingUpdates: vi.fn(),
                        rejectPendingUpdates: vi.fn(),
                        updateVariantsStatus: vi.fn(),
                        archiveVariants: vi.fn(),
                    },
                },
                {
                    provide: ProductRepository,
                    useValue: {
                        findById: vi.fn(),
                    },
                },
                {
                    provide: CategoryService,
                    useValue: {
                        existsInMarket: vi.fn(),
                    },
                },
                {
                    provide: SupabaseService,
                    useValue: {
                        getPublicURL: vi.fn(
                            (path: string) =>
                                `https://example.com/storage/v1/object/public/products/${path}`,
                        ),
                        getObjectInfo: vi.fn(),
                        deleteFile: vi.fn(),
                    },
                },
                {
                    provide: MarketsService,
                    useValue: {
                        findOne: vi.fn(),
                        validateIds: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ProductVariantService>(ProductVariantService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
