import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewsRepository } from './reviews.repository.js';
import { ReviewsService } from './reviews.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    REVIEWS_BUCKET: 'reviews',
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

describe('ReviewsService', () => {
    let service: ReviewsService;

    beforeEach(async () => {
        const { SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReviewsService,
                {
                    provide: ReviewsRepository,
                    useValue: {
                        create: vi.fn(),
                        findById: vi.fn(),
                        findAllByMarketVariant: vi.fn(),
                        incrementLikes: vi.fn(),
                        incrementDislikes: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: SupabaseService,
                    useValue: {
                        getPublicURL: vi.fn(
                            (path: string) =>
                                `https://example.com/storage/v1/object/public/reviews/${path}`,
                        ),
                        createSignedUploadUrl: vi.fn(),
                        getObjectInfo: vi.fn(),
                        deleteFile: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ReviewsService>(ReviewsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
