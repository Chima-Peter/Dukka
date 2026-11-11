import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';

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
        RedisService: class RedisService {},
        SupabaseService: class SupabaseService {},
        AVATAR_BUCKET: 'avatar',
        MAX_AVATAR_BYTES: 5 * 1024 * 1024,
        ALLOWED_AVATAR_CONTENT_TYPES: new Set(['image/jpeg']),
    };
});

describe('CustomerAuthController', () => {
    let controller: CustomerAuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CustomerAuthController],
            providers: [
                {
                    provide: CustomerAuthService,
                    useValue: {
                        register: vi.fn(),
                        login: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CustomerAuthController>(CustomerAuthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
