import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketStatus } from '../../generated/prisma/client.js';
import { MarketsRepository } from './markets.repository.js';
import { MarketsService } from './markets.service.js';

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
        setStatus: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        countServiceCountries: ReturnType<typeof vi.fn>;
        findStaffContactsByMarketId: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        const { MailQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        marketsRepository = {
            create: vi.fn(),
            findAll: vi.fn(),
            findExistingByIds: vi.fn(),
            findById: vi.fn(),
            update: vi.fn(),
            setStatus: vi.fn(),
            delete: vi.fn(),
            countServiceCountries: vi.fn().mockResolvedValue(0),
            findStaffContactsByMarketId: vi.fn().mockResolvedValue([]),
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

    it('rejects update when market is closed', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.CLOSED },
        ]);

        await expect(
            service.update('market-1', { name: 'Lagos' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(marketsRepository.update).not.toHaveBeenCalled();
    });

    it('skips staff email on update by default', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.OPEN },
        ]);
        marketsRepository.update.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
            status: MarketStatus.OPEN,
            currency: { id: 'cur-1', code: 'NGN', name: 'Naira' },
        });

        await service.update('market-1', { name: 'Lagos' });

        expect(marketsRepository.update).toHaveBeenCalledWith('market-1', {
            name: 'Lagos',
        });
        expect(mailQueue.enqueueSendMany).not.toHaveBeenCalled();
    });

    it('opens a closed market', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.CLOSED },
        ]);
        marketsRepository.setStatus.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
            status: MarketStatus.OPEN,
            currency: { id: 'cur-1', code: 'NGN', name: 'Naira' },
        });

        await service.open('market-1');

        expect(marketsRepository.setStatus).toHaveBeenCalledWith(
            'market-1',
            MarketStatus.OPEN,
        );
    });

    it('rejects open when market is already open', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.OPEN },
        ]);

        await expect(service.open('market-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(marketsRepository.setStatus).not.toHaveBeenCalled();
    });

    it('closes an open market', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.OPEN },
        ]);
        marketsRepository.setStatus.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
            status: MarketStatus.CLOSED,
            currency: { id: 'cur-1', code: 'NGN', name: 'Naira' },
        });

        await service.close('market-1');

        expect(marketsRepository.setStatus).toHaveBeenCalledWith(
            'market-1',
            MarketStatus.CLOSED,
        );
    });

    it('rejects delete when market is not closed', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.OPEN },
        ]);

        await expect(service.delete('market-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(marketsRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes a closed market', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.CLOSED },
        ]);
        marketsRepository.countServiceCountries.mockResolvedValue(0);
        marketsRepository.delete.mockResolvedValue({
            id: 'market-1',
            name: 'Lagos',
            code: 'LOS',
        });

        await service.delete('market-1');

        expect(marketsRepository.delete).toHaveBeenCalledWith('market-1');
    });

    it('rejects delete when market still has service countries', async () => {
        marketsRepository.findExistingByIds.mockResolvedValue([
            { id: 'market-1', status: MarketStatus.CLOSED },
        ]);
        marketsRepository.countServiceCountries.mockResolvedValue(2);

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
