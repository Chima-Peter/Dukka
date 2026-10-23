import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerService } from '../customer/customer.service.js';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';

describe('CategoryService', () => {
    let service: CategoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoryService,
                {
                    provide: CategoryRepository,
                    useValue: {
                        create: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                        addToMarket: vi.fn(),
                        findAllByMarket: vi.fn(),
                        removeFromMarket: vi.fn(),
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

        service = module.get<CategoryService>(CategoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
