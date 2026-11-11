import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsService } from '../payments/payments.service.js';
import { MarketsService } from '../markets/markets.service.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { CustomerRepository } from './customer.repository.js';
import { CustomerService } from './customer.service.js';

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

describe('CustomerService', () => {
    let service: CustomerService;

    beforeEach(async () => {
        const { RedisService, SupabaseService } = await import(
            '../../../../libs/common/src/index.ts'
        );
        const { MailQueueService, GeneralQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerService,
                {
                    provide: CustomerRepository,
                    useValue: {
                        create: vi.fn(),
                        findByEmail: vi.fn(),
                        findByID: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: MarketsService,
                    useValue: {
                        findByIdOrThrow: vi.fn(),
                        requireOpenMarket: vi.fn(),
                    },
                },
                {
                    provide: SupabaseService,
                    useValue: {
                        getObjectInfo: vi.fn(),
                        deleteFile: vi.fn(),
                        createSignedUploadUrl: vi.fn(),
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
                    provide: PaymentsService,
                    useValue: {
                        hasPendingAttemptsForCustomer: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CustomerService>(CustomerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
