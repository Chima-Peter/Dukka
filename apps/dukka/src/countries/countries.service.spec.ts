import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CountryStatus } from '../../generated/prisma/client.js';
import { CountriesRepository } from './countries.repository.js';
import { CountriesService } from './countries.service.js';

vi.mock('../markets/markets.service.js', () => ({
    MarketsService: class MarketsService {},
}));

const countryBase = {
    id: 'country-1',
    code: 'NG',
    name: 'Nigeria',
    status: CountryStatus.PENDING_REVIEW,
    market_id: null as string | null,
    created_at: new Date(),
    updated_at: new Date(),
    market: null,
};

describe('CountriesService', () => {
    let service: CountriesService;
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
                CountriesService,
                {
                    provide: CountriesRepository,
                    useValue: repository,
                },
                {
                    provide: MarketsService,
                    useValue: marketsService,
                },
            ],
        }).compile();

        service = module.get<CountriesService>(CountriesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('approves a country pending review', async () => {
        repository.findById.mockResolvedValue(countryBase);
        repository.updateStatus.mockResolvedValue({
            ...countryBase,
            status: CountryStatus.APPROVED,
        });

        const result = await service.approve(countryBase.id);

        expect(repository.updateStatus).toHaveBeenCalledWith(
            countryBase.id,
            CountryStatus.APPROVED,
        );
        expect(result.status).toBe(CountryStatus.APPROVED);
    });

    it('rejects assigning an unapproved country', async () => {
        repository.findById.mockResolvedValue(countryBase);

        await expect(
            service.assignMarket(
                countryBase.id,
                { market_id: 'market-1' },
                ['market-1'],
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assigns an approved country to a market', async () => {
        const approved = {
            ...countryBase,
            status: CountryStatus.APPROVED,
        };
        repository.findById.mockResolvedValue(approved);
        repository.assignMarket.mockResolvedValue({
            ...approved,
            market_id: 'market-1',
            market: {
                id: 'market-1',
                code: 'NG',
                name: 'Nigeria Market',
                is_active: true,
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
            status: CountryStatus.APPROVED,
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
