import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    RedisService: class RedisService {},
    PrismaService: class PrismaService {},
    STREAM_START_ID: '$',
}));

describe('NotificationsService', () => {
    let service: NotificationsService;

    beforeEach(async () => {
        const { RedisService } = await import(
            '../../../../libs/common/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: NotificationsRepository,
                    useValue: {
                        findForCustomer: vi.fn(),
                        findForStaff: vi.fn(),
                        markReadForCustomer: vi.fn(),
                        markReadForStaff: vi.fn(),
                    },
                },
                {
                    provide: RedisService,
                    useValue: {
                        startStream: vi.fn(),
                        readStream: vi.fn(),
                        closeStream: vi.fn(),
                        addToStream: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
