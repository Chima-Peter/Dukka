import { Test, TestingModule } from '@nestjs/testing';
import { CustomerRepository } from './customer.repository.js';
import { CustomerService } from './customer.service.js';

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: {
            create: vi.fn(),
            findByEmail: vi.fn(),
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
