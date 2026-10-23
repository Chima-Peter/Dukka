import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketsRepository } from './markets.repository.js';
import { MarketsService } from './markets.service.js';

vi.mock('../countries/countries.service.js', () => ({
    CountriesService: class CountriesService {},
}));

vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    MAIL_QUEUE: 'mail',
    MAIL_JOBS: { SEND: 'send' },
    MAIL_TEMPLATES: {
        CUSTOMER_WELCOME: 'customer.welcome',
        CUSTOMER_PASSWORD_RESET: 'customer.password-reset',
        CUSTOMER_PASSWORD_CHANGED: 'customer.password-changed',
        CUSTOMER_ACCOUNT_DELETION: 'customer.account-deletion',
        CUSTOMER_ACCOUNT_DELETED: 'customer.account-deleted',
        STAFF_WELCOME: 'staff.welcome',
        STAFF_INVITATION: 'staff.invitation',
        STAFF_PASSWORD_RESET: 'staff.password-reset',
        STAFF_PASSWORD_CHANGED: 'staff.password-changed',
        STAFF_DEACTIVATED: 'staff.deactivated',
        STAFF_ACCOUNT_UPDATED: 'staff.account-updated',
        STAFF_ROLE_ASSIGNED: 'staff.role-assigned',
        STAFF_ROLE_REVOKED: 'staff.role-revoked',
        STAFF_ROLE_UPDATED: 'staff.role-updated',
        STAFF_PERMISSIONS_CHANGED: 'staff.permissions-changed',
        STAFF_MARKETS_CHANGED: 'staff.markets-changed',
        MARKET_UPDATED: 'market.updated',
        MARKET_DELETED: 'market.deleted',
    },
    QueuesModule: class QueuesModule {},
}));

describe('MarketsService', () => {
    let service: MarketsService;
    let mailQueue: {
        enqueueSend: ReturnType<typeof vi.fn>;
        enqueueSendMany: ReturnType<typeof vi.fn>;
    };
    let marketsRepository: {
        create: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
        findExistingByIds: ReturnType<typeof vi.fn>;
        findById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        setActive: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        findStaffContactsByMarketId: ReturnType<typeof vi.fn>;
    };
    let countriesService: {
        countByMarketId: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        const { MailQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );
        const { CountriesService } = await import(
            '../countries/countries.service.js'
        );

        marketsRepository = {
            create: vi.fn(),
            findAll: vi.fn(),
            findExistingByIds: vi.fn(),
            findById: vi.fn(),
            update: vi.fn(),
            setActive: vi.fn(),
            delete: vi.fn(),
            findStaffContactsByMarketId: vi.fn().mockResolvedValue([]),
        };
        countriesService = {
            countByMarketId: vi.fn().mockResolvedValue(0),
        };
        mailQueue = {
            enqueueSend: vi.fn(),
            enqueueSendMany: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MarketsService,
                {
                    provide: MarketsRepository,
                    useValue: marketsRepository,
                },
                {
                    provide: CountriesService,
                    useValue: countriesService,
                },
                {
                    provide: MailQueueService,
                    useValue: mailQueue,
                },
            ],
        }).compile();

        service = module.get<MarketsService>(MarketsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('rejects update when market is inactive', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: false },
        ]);

        await expect(
            service.update('market-1', { name: 'Lagos' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(marketsRepository.update).not.toHaveBeenCalled();
    });

    it('skips staff email on update by default', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: true },
        ]);
        marketsRepository.update.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
            is_active: true,
            currency: { id: 'cur-1', code: 'NGN', name: 'Naira' },
        });

        await service.update('market-1', { name: 'Lagos' });

        expect(marketsRepository.update).toHaveBeenCalledWith('market-1', {
            name: 'Lagos',
        });
        expect(mailQueue.enqueueSendMany).not.toHaveBeenCalled();
    });

    it('activates an inactive market', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: false },
        ]);
        marketsRepository.setActive.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
            is_active: true,
            currency: { id: 'cur-1', code: 'NGN', name: 'Naira' },
        });

        await service.activate('market-1');

        expect(marketsRepository.setActive).toHaveBeenCalledWith(
            'market-1',
            true,
        );
    });

    it('rejects activate when market is already active', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: true },
        ]);

        await expect(service.activate('market-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(marketsRepository.setActive).not.toHaveBeenCalled();
    });

    it('deactivates an active market', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: true },
        ]);
        marketsRepository.setActive.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
            is_active: false,
            currency: { id: 'cur-1', code: 'NGN', name: 'Naira' },
        });

        await service.deactivate('market-1');

        expect(marketsRepository.setActive).toHaveBeenCalledWith(
            'market-1',
            false,
        );
    });

    it('rejects delete when market is still active', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: true },
        ]);

        await expect(service.delete('market-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(marketsRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes an inactive market', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: false },
        ]);
        countriesService.countByMarketId.mockResolvedValue(0);
        marketsRepository.delete.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
        });

        await service.delete('market-1');

        expect(marketsRepository.delete).toHaveBeenCalledWith('market-1');
    });

    it('rejects delete when market still has countries', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', is_active: false },
        ]);
        countriesService.countByMarketId.mockResolvedValue(2);

        await expect(service.delete('market-1')).rejects.toBeInstanceOf(
            ConflictException,
        );
        expect(marketsRepository.delete).not.toHaveBeenCalled();
    });

    it('rejects update when market is missing', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([]);

        await expect(
            service.update('market-1', { name: 'Lagos' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
