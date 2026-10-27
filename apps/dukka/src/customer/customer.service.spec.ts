import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketsService } from '../markets/markets.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { CustomerRepository } from './customer.repository.js';
import { CustomerService } from './customer.service.js';
import { TokenRepository } from './token.repository.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    RedisService: class RedisService {},
    SupabaseService: class SupabaseService {},
    AVATAR_BUCKET: 'avatar',
    MAX_AVATAR_BYTES: 5 * 1024 * 1024,
    ALLOWED_AVATAR_CONTENT_TYPES: new Set(['image/jpeg']),
}));
vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    MAIL_QUEUE: 'mail',
    GENERAL_QUEUE: 'general',
    MAIL_JOBS: { SEND: 'send' },
    GENERAL_JOBS: {
        EXPIRED_RESERVATIONS: 'expired-reservations',
        ORDER_MATCHING: 'order-matching',
        INVENTORY_STOCK_REMINDER: 'inventory-stock-reminder',
        CUSTOMER_ACCOUNT_DELETED: 'customer-account-deleted',
    },
    MAIL_TEMPLATES: {
        CUSTOMER_WELCOME: 'customer.welcome',
        CUSTOMER_PASSWORD_RESET: 'customer.password-reset',
        CUSTOMER_PASSWORD_CHANGED: 'customer.password-changed',
        CUSTOMER_ACCOUNT_DELETION: 'customer.account-deletion',
        CUSTOMER_ACCOUNT_DELETED: 'customer.account-deleted',
        STAFF_WELCOME: 'staff.welcome',
        STAFF_INVITATION: 'staff.invitation',
        STAFF_PASSWORD_RESET: 'staff.password-reset',
        STAFF_PASSWORD_CHANGED: 'staff.password-changed',
        STAFF_DEACTIVATED: 'staff.deactivated',
        STAFF_ACCOUNT_UPDATED: 'staff.account-updated',
        STAFF_ROLE_ASSIGNED: 'staff.role-assigned',
        STAFF_ROLE_REVOKED: 'staff.role-revoked',
        STAFF_ROLE_UPDATED: 'staff.role-updated',
        STAFF_PERMISSIONS_CHANGED: 'staff.permissions-changed',
        STAFF_MARKETS_CHANGED: 'staff.markets-changed',
        MARKET_UPDATED: 'market.updated',
        MARKET_DELETED: 'market.deleted',
    },
    QueuesModule: class QueuesModule {},
}));

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
                        validateIds: vi.fn(),
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
                    provide: TokenRepository,
                    useValue: {
                        findAllByCustomerId: vi.fn(),
                        deleteAllByCustomerId: vi.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        decode: vi.fn(),
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
