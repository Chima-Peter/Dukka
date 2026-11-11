import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('../../../../libs/common/src/index.ts')
    >();
    return {
        ...actual,
        Auth: () => () => undefined,
        CurrentCustomer: () => () => undefined,
        CurrentStaff: () => () => undefined,
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

describe('OrdersController', () => {
    let controller: OrdersController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [
                {
                    provide: OrdersService,
                    useValue: {
                        findForCustomer: vi.fn(),
                        findForStaff: vi.fn(),
                        createForCustomer: vi.fn(),
                        createForGuest: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<OrdersController>(OrdersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
