import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseService } from '@app/common';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';

describe('ProductService', () => {
    let service: ProductService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: ProductRepository,
                    useValue: {
                        create: vi.fn(),
                        findById: vi.fn(),
                        update: vi.fn(),
                        updateStatus: vi.fn(),
                    },
                },
                {
                    provide: SupabaseService,
                    useValue: {
                        getPublicURL: vi.fn(
                            (path: string) => `https://example.com/${path}`,
                        ),
                    },
                },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
