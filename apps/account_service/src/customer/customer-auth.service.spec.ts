import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@app/common';
import { CustomerService } from './customer.service.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { PasswordHasher } from '../shared/index.js';
import { TokenRepository } from './token.repository.js';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        {
          provide: CustomerService,
          useValue: {
            create: vi.fn(),
            findByEmail: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(),
            decode: vi.fn(),
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
            create: vi.fn(),
            findAllByCustomerId: vi.fn(),
            findByToken: vi.fn(),
            deleteByToken: vi.fn(),
            deleteAllByCustomerId: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerAuthService>(CustomerAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
