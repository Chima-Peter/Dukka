import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('../../../../libs/common/src/index.ts')
    >();
    return {
        ...actual,
        Auth: () => () => undefined,
        CurrentCustomer: () => () => undefined,
        CurrentStaff: () => () => undefined,
        OptionalCustomerAuth: () => () => undefined,
        Public: () => () => undefined,
        RequirePermission: () => () => undefined,
        ResponseMessage: () => () => undefined,
        StaffPermission: new Proxy(
            {},
            {
                get: (_target, property) => String(property),
            },
        ),
        SupabaseService: class SupabaseService {},
        PRODUCT_BUCKET: 'products',
        REVIEWS_BUCKET: 'reviews',
        ALLOWED_PRODUCT_CONTENT_TYPES: new Set([
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
        ]),
    };
});

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
