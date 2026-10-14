import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService, SupabaseService } from '@app/common';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { CustomerRepository } from './customer.repository.js';
import { CustomerService } from './customer.service.js';
import { TokenRepository } from './token.repository.js';

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
                        findByID: vi.fn(),
                        delete: vi.fn(),
                    },
                },
                {
                    provide: SupabaseService,
                    useValue: {
                        getObjectInfo: vi.fn(),
                        deleteFile: vi.fn(),
                        createSignedUploadUrl: vi.fn(),
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
                        deleteAllByCustomerId: vi.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        decode: vi.fn(),
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
