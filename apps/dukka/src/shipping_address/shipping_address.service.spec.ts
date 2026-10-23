import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from '../customer/customer.service.js';
import { ShippingAddressRepository } from './shipping_address.repository.js';
import { ShippingAddressService } from './shipping_address.service.js';

describe('ShippingAddressService', () => {
    let service: ShippingAddressService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShippingAddressService,
                {
                    provide: ShippingAddressRepository,
                    useValue: {
                        create: vi.fn(),
                        findAllByCustomerId: vi.fn(),
                        findById: vi.fn(),
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

        service = module.get<ShippingAddressService>(ShippingAddressService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
