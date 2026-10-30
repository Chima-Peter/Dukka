import { Test, TestingModule } from '@nestjs/testing';
import { BillingAddressService } from '../address/billing-address.service.js';
import { ShippingAddressService } from '../address/shipping-address.service.js';
import { CartService } from '../cart/cart.service.js';
import { PointsService } from '../points/points.service.js';
import { CheckoutService } from './checkout.service.js';

describe('CheckoutService', () => {
    let service: CheckoutService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CheckoutService,
                {
                    provide: ShippingAddressService,
                    useValue: { findAll: vi.fn() },
                },
                {
                    provide: BillingAddressService,
                    useValue: { findAll: vi.fn() },
                },
                {
                    provide: PointsService,
                    useValue: { getBalance: vi.fn() },
                },
                {
                    provide: CartService,
                    useValue: {
                        getForCustomerWithSyncedTotal: vi.fn(),
                        getForGuestWithSyncedTotal: vi.fn(),
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
