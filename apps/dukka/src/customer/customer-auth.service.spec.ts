import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartRepository } from '../cart/cart.repository.js';
import { PasswordHasher } from '../shared/index.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerService } from './customer.service.js';
import { TokenRepository } from './token.repository.js';

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

describe('CustomerAuthService', () => {
    let service: CustomerAuthService;

    beforeEach(async () => {
        const { RedisService } = await import(
            '../../../../libs/common/src/index.ts'
        );
        const { MailQueueService, GeneralQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerAuthService,
                {
                    provide: CustomerService,
                    useValue: {
                        create: vi.fn(),
                        findByEmail: vi.fn(),
                        changePassword: vi.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: vi.fn(),
                        decode: vi.fn(),
                    },
                },
                {
                    provide: PasswordHasher,
                    useValue: {
                        hash: vi.fn(),
                        verify: vi.fn(),
                    },
                },
                {
                    provide: RedisService,
                    useValue: {
                        set: vi.fn(),
                        get: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: TokenRepository,
                    useValue: {
                        create: vi.fn(),
                        createMany: vi.fn(),
                        findAllByCustomerId: vi.fn(),
                        findByToken: vi.fn(),
                        findRefreshToken: vi.fn(),
                        deleteRefreshToken: vi.fn(),
                        deleteByToken: vi.fn(),
                        deleteAllByCustomerId: vi.fn(),
                    },
                },
                {
                    provide: MailQueueService,
                    useValue: {
                        enqueueSend: vi.fn(),
                        enqueueSendMany: vi.fn(),
                    },
                },
                {
                    provide: GeneralQueueService,
                    useValue: {
                        enqueue: vi.fn(),
                        enqueueMany: vi.fn(),
                    },
                },
                {
                    provide: CartRepository,
                    useValue: {
                        findOrCreateCartIdForCustomer: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CustomerAuthService>(CustomerAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
