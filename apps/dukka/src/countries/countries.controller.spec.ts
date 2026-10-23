import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CountriesController } from './countries.controller.js';
import { CountriesService } from './countries.service.js';

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
    Public: () => () => undefined,
    RequirePermission: () => () => undefined,
    ResponseMessage: () => () => undefined,
    CurrentStaff: () => () => undefined,
    StaffPermission: new Proxy(
        {},
        {
            get: (_target, property) => String(property),
        },
    ),
}));

describe('CountriesController', () => {
    let controller: CountriesController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CountriesController],
            providers: [
                {
                    provide: CountriesService,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        update: vi.fn(),
                        open: vi.fn(),
                        close: vi.fn(),
                        assignMarket: vi.fn(),
                        removeMarket: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CountriesController>(CountriesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
