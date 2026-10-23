import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

vi.mock('@app/queues', () => ({
    MAIL_TEMPLATES: {},
    MailQueueService: class MailQueueService {},
}));

vi.mock('../customer/customer.service.js', () => ({
    CustomerService: class CustomerService {},
}));

vi.mock('../../../../libs/common/src/index.ts', () => ({
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
                        updateImages: vi.fn(),
                        approve: vi.fn(),
                        reject: vi.fn(),
                        archive: vi.fn(),
                        getImageUploadURLs: vi.fn(),
                        findPendingUpdatesForStaff: vi.fn(),
                        findPendingUpdateById: vi.fn(),
                        updatePendingUpdate: vi.fn(),
                        approvePendingUpdates: vi.fn(),
                        rejectPendingUpdates: vi.fn(),
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
