import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
    let service: OrdersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: OrdersRepository,
                    useValue: {
                        createForCustomer: vi.fn(),
                        createForGuest: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
