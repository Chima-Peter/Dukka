import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

describe('CheckoutController', () => {
    let controller: CheckoutController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CheckoutController],
            providers: [
                {
                    provide: CheckoutService,
                    useValue: { getPrecheckout: vi.fn() },
                },
            ],
        }).compile();

        controller = module.get<CheckoutController>(CheckoutController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
