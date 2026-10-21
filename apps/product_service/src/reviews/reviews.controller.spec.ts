import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
    CurrentCustomer: () => () => undefined,
    Public: () => () => undefined,
    ResponseMessage: () => () => undefined,
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

describe('ReviewsController', () => {
    let controller: ReviewsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReviewsController],
            providers: [
                {
                    provide: ReviewsService,
                    useValue: {
                        getImageUploadURLs: vi.fn(),
                        create: vi.fn(),
                        findAll: vi.fn(),
                        like: vi.fn(),
                        dislike: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ReviewsController>(ReviewsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
