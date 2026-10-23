import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';

vi.mock('@app/queues', () => ({
    MAIL_TEMPLATES: {},
    MailQueueService: class MailQueueService {},
}));

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

vi.mock('../customer/customer.service.js', () => ({
    CustomerService: class CustomerService {},
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

describe('ProductService', () => {
    let service: ProductService;

    beforeEach(async () => {
        const { SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
        );
        const { MarketsService } = await import(
            '../markets/markets.service.js'
        );
        const { CustomerService } = await import(
            '../customer/customer.service.js'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: ProductRepository,
                    useValue: {
                        create: vi.fn(),
                        findById: vi.fn(),
                        update: vi.fn(),
                        updateStatus: vi.fn(),
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
                {
                    provide: CustomerService,
                    useValue: {
                        getActiveMarketId: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
