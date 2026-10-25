import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ServiceCountryStatus,
    MarketStatus,
} from '@app/common';
import { ServiceCountryRepository } from './service-country.repository.js';
import { ServiceCountryService } from './service-country.service.js';

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

const countryBase = {
    id: 'country-1',
    code: 'NG',
    name: 'Nigeria',
    status: ServiceCountryStatus.PENDING,
    market_id: null as string | null,
    created_at: new Date(),
    updated_at: new Date(),
    market: null,
};

describe('ServiceCountryService', () => {
    let service: ServiceCountryService;
    let repository: {
        create: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
        findById: ReturnType<typeof vi.fn>;
        findWithMarketStatus: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateStatus: ReturnType<typeof vi.fn>;
        assignMarket: ReturnType<typeof vi.fn>;
        removeMarket: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        countByMarketId: ReturnType<typeof vi.fn>;
        countServiceStates: ReturnType<typeof vi.fn>;
        countWarehouses: ReturnType<typeof vi.fn>;
    };
    let marketsService: {
        validateIds: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        const { MarketsService } = await import('../markets/markets.service.js');

        repository = {
            create: vi.fn(),
            findAll: vi.fn(),
            findById: vi.fn(),
            findWithMarketStatus: vi.fn(),
            update: vi.fn(),
            updateStatus: vi.fn(),
            assignMarket: vi.fn(),
            removeMarket: vi.fn(),
            delete: vi.fn(),
            countByMarketId: vi.fn().mockResolvedValue(0),
            countServiceStates: vi.fn().mockResolvedValue(0),
            countWarehouses: vi.fn().mockResolvedValue(0),
        };
        marketsService = {
            validateIds: vi.fn().mockResolvedValue({
                valid: true,
                invalid_ids: [],
                inactive_ids: [],
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceCountryService,
                {
                    provide: ServiceCountryRepository,
                    useValue: repository,
                },
                {
                    provide: MarketsService,
                    useValue: marketsService,
                },
            ],
        }).compile();

        service = module.get<ServiceCountryService>(ServiceCountryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('opens a pending country', async () => {
        repository.findById.mockResolvedValue(countryBase);
        repository.updateStatus.mockResolvedValue({
            ...countryBase,
            status: ServiceCountryStatus.OPEN,
        });

        const result = await service.open(countryBase.id);

        expect(repository.updateStatus).toHaveBeenCalledWith(
            countryBase.id,
            ServiceCountryStatus.OPEN,
        );
        expect(result.status).toBe(ServiceCountryStatus.OPEN);
    });

    it('rejects assigning a non-open country', async () => {
        repository.findById.mockResolvedValue(countryBase);

        await expect(
            service.assignMarket(
                countryBase.id,
                { market_id: 'market-1' },
                ['market-1'],
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assigns an open country to a market', async () => {
        const open = {
            ...countryBase,
            status: ServiceCountryStatus.OPEN,
        };
        repository.findById.mockResolvedValue(open);
        repository.assignMarket.mockResolvedValue({
            ...open,
            market_id: 'market-1',
            market: {
                id: 'market-1',
                code: 'NG',
                name: 'Nigeria Market',
                status: MarketStatus.OPEN,
            },
        });

        const result = await service.assignMarket(
            countryBase.id,
            { market_id: 'market-1' },
            ['market-1'],
        );

        expect(marketsService.validateIds).toHaveBeenCalledWith({
            market_ids: ['market-1'],
        });
        expect(repository.assignMarket).toHaveBeenCalledWith(
            countryBase.id,
            'market-1',
        );
        expect(result.market_id).toBe('market-1');
    });

    it('rejects deleting a country that is still assigned', async () => {
        repository.findById.mockResolvedValue({
            ...countryBase,
            status: ServiceCountryStatus.CLOSED,
            market_id: 'market-1',
        });

        await expect(service.delete(countryBase.id)).rejects.toBeInstanceOf(
            ConflictException,
        );
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('throws when country is missing', async () => {
        repository.findById.mockResolvedValue(null);

        await expect(
            service.update(countryBase.id, { name: 'X' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
