import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrenciesController } from './currencies.controller.js';
import { CurrenciesService } from './currencies.service.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('../../../../libs/common/src/index.ts')
    >();
    return {
        ...actual,
        Auth: () => () => undefined,
        CurrentCustomer: () => () => undefined,
        CurrentStaff: () => () => undefined,
        OptionalCustomerAuth: () => () => undefined,
        Public: () => () => undefined,
        RequirePermission: () => () => undefined,
        ResponseMessage: () => () => undefined,
        StaffPermission: new Proxy(
            {},
            {
                get: (_target, property) => String(property),
            },
        ),
    };
});

describe('CurrenciesController', () => {
    let controller: CurrenciesController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CurrenciesController],
            providers: [
                {
                    provide: CurrenciesService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CurrenciesController>(CurrenciesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
