import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@app/common';
import { CustomerService } from '../customer/customer.service.js';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from '../shared/index.js';
import { TokenRepository } from './token.repository.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
