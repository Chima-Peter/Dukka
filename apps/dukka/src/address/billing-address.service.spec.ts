import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from '../customer/customer.service.js';
import { BillingAddressRepository } from './billing-address.repository.js';
import { BillingAddressService } from './billing-address.service.js';

describe('BillingAddressService', () => {
    let service: BillingAddressService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BillingAddressService,
                {
                    provide: BillingAddressRepository,
                    useValue: {
                        create: vi.fn(),
                        findAllByCustomerId: vi.fn(),
                        findByIdAndCustomerId: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: CustomerService,
                    useValue: {
                        getActiveMarketId: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<BillingAddressService>(BillingAddressService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
