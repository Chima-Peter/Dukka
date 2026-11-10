import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketsController } from './markets.controller.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('../../../../libs/common/src/index.ts')
        >();
    return {
        ...actual,
        Auth: () => () => undefined,
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

vi.mock('./markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

describe('MarketsController', () => {
    let controller: MarketsController;

    beforeEach(async () => {
        const { MarketsService } = await import('./markets.service.js');

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MarketsController],
            providers: [
                {
                    provide: MarketsService,
                    useValue: {
                        create: vi.fn(),
                        validateIds: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        findStaff: vi.fn(),
                        update: vi.fn(),
                        open: vi.fn(),
                        close: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<MarketsController>(MarketsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
