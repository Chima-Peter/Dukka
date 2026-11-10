import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DistributionPointsController } from './distribution-points.controller.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('../../../../libs/common/src/index.ts')
        >();
    return {
        ...actual,
        Auth: () => () => undefined,
        CurrentStaff: () => () => undefined,
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

vi.mock('./distribution-points.service.js', () => ({
    DistributionPointsService: class DistributionPointsService {},
}));

describe('DistributionPointsController', () => {
    let controller: DistributionPointsController;

    beforeEach(async () => {
        const { DistributionPointsService } = await import(
            './distribution-points.service.js'
        );

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DistributionPointsController],
            providers: [
                {
                    provide: DistributionPointsService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        findStaff: vi.fn(),
                        update: vi.fn(),
                        close: vi.fn(),
                        open: vi.fn(),
                        assignStaff: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<DistributionPointsController>(
            DistributionPointsController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
