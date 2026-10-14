import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';

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
