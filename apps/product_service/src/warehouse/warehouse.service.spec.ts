import { Test, TestingModule } from '@nestjs/testing';
import { getHttpClientToken } from '@nestjs/http-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_HTTP_CLIENT } from '../shared/account-http.constants.js';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';

describe('WarehouseService', () => {
    let service: WarehouseService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WarehouseService,
                {
                    provide: WarehouseRepository,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findByIdOrThrow: vi.fn(),
                        updateManager: vi.fn(),
                        close: vi.fn(),
                        open: vi.fn(),
                    },
                },
                {
                    provide: getHttpClientToken(ACCOUNT_HTTP_CLIENT),
                    useValue: {
                        post: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<WarehouseService>(WarehouseService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
