import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisService } from '@app/common';
import { BillingAddressService } from '../address/billing-address.service.js';
import { ShippingAddressService } from '../address/shipping-address.service.js';
import { CartService } from '../cart/cart.service.js';
import { CustomerService } from '../customer/customer.service.js';
import { MarketsService } from '../markets/markets.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PaystackService } from '../payments/providers/index.js';
import { PointsService } from '../points/points.service.js';
import { ServiceStateService } from '../service/service-state.service.js';
import { CheckoutRepository } from './checkout.repository.js';
import { CheckoutService } from './checkout.service.js';

vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    GeneralQueueService: class GeneralQueueService {},
    MAIL_QUEUE: 'mail',
    GENERAL_QUEUE: 'general',
    MAIL_JOBS: { SEND: 'send' },
    GENERAL_JOBS: {
        CANCEL_ORDER: 'cancel-order',
        ORDER_PROCESSING: 'order-processing',
        ORDER_AWAITING_PAYMENT: 'order-awaiting-payment',
        ORDER_SHIPPED: 'order-shipped',
    },
    MAIL_TEMPLATES: {},
    QueuesModule: class QueuesModule {},
}));

describe('CheckoutService', () => {
    let service: CheckoutService;

    beforeEach(async () => {
        const { GeneralQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CheckoutService,
                {
                    provide: ShippingAddressService,
                    useValue: {
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        findById: vi.fn(),
                        findGuestByIdAndEmail: vi.fn(),
                    },
                },
                {
                    provide: BillingAddressService,
                    useValue: {
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        findGuestByIdAndEmail: vi.fn(),
                    },
                },
                {
                    provide: PointsService,
                    useValue: {
                        getBalance: vi.fn(),
                    },
                },
                {
                    provide: CartService,
                    useValue: {
                        getForCustomerWithSyncedTotal: vi.fn(),
                        getForGuestWithSyncedTotal: vi.fn(),
                        clearCart: vi.fn(),
                    },
                },
                {
                    provide: CustomerService,
                    useValue: { getActiveMarketId: vi.fn() },
                },
                {
                    provide: PaymentsService,
                    useValue: {
                        findAvailableForMarket: vi.fn(),
                        findMarketPaymentMethod: vi.fn(),
                        updatePaymentIntent: vi.fn(),
                        findAttemptByOrderId: vi.fn(),
                    },
                },
                {
                    provide: ServiceStateService,
                    useValue: { findWarehouseCoveringState: vi.fn() },
                },
                {
                    provide: PaystackService,
                    useValue: { initializeTransaction: vi.fn() },
                },
                {
                    provide: CheckoutRepository,
                    useValue: { place: vi.fn() },
                },
                {
                    provide: GeneralQueueService,
                    useValue: { enqueue: vi.fn() },
                },
                {
                    provide: RedisService,
                    useValue: {
                        getObject: vi.fn(),
                        setObject: vi.fn(),
                        lock: vi.fn(),
                        unlock: vi.fn(),
                    },
                },
                {
                    provide: OrdersService,
                    useValue: {
                        findByIdempotencyKey: vi.fn(),
                    },
                },
                {
                    provide: MarketsService,
                    useValue: {
                        getCashLimit: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CheckoutService>(CheckoutService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
