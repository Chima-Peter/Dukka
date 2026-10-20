import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrenciesRepository } from './currencies.repository.js';
import { CurrenciesService } from './currencies.service.js';

describe('CurrenciesService', () => {
    let service: CurrenciesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrenciesService,
                {
                    provide: CurrenciesRepository,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findById: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CurrenciesService>(CurrenciesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
