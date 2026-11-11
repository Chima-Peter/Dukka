import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsService } from './shipments.service.js';

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

describe('ShipmentsController', () => {
    let controller: ShipmentsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShipmentsController],
            providers: [
                {
                    provide: ShipmentsService,
                    useValue: {
                        move: vi.fn(),
                        track: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ShipmentsController>(ShipmentsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
