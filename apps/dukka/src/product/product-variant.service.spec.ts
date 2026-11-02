import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductVariantRepository } from './product-variant.repository.js';
import { ProductVariantService } from './product-variant.service.js';

vi.mock('@app/queues', () => ({
    MAIL_TEMPLATES: {},
    MailQueueService: class MailQueueService {},
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
    PrismaService: class PrismaService {},
    MarketVariantStatus: {
        ACTIVE: 'ACTIVE',
        CLOSED: 'CLOSED',
    },
    ProductStatus: {
        PENDING_REVIEW: 'PENDING_REVIEW',
        ACTIVE: 'ACTIVE',
        REJECTED: 'REJECTED',
        ARCHIVED: 'ARCHIVED',
    },
    VariantPendingUpdateStatus: {
        PENDING: 'PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
    },
    VariantStatus: {
        PENDING_REVIEW: 'PENDING_REVIEW',
        ACTIVE: 'ACTIVE',
        REJECTED: 'REJECTED',
        ARCHIVED: 'ARCHIVED',
    },
    MarketStatus: {
        OPEN: 'OPEN',
        CLOSED: 'CLOSED',
    },
}));

describe('ProductVariantService', () => {
    let service: ProductVariantService;

    beforeEach(async () => {
        const { SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
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
                        findMarketVariants: vi.fn(),
                        createVariant: vi.fn(),
                        findVariantInProduct: vi.fn(),
                        findProductVariantForMarketListing: vi.fn(),
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
