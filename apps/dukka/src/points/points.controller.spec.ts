import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PointsController } from './points.controller.js';
import { PointsService } from './points.service.js';

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

describe('PointsController', () => {
    let controller: PointsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PointsController],
            providers: [
                {
                    provide: PointsService,
                    useValue: {
                        findHistory: vi.fn(),
                        earn: vi.fn(),
                        redeem: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<PointsController>(PointsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
