import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesRepository } from './roles.repository.js';
import { RolesService } from './roles.service.js';


describe('RolesService', () => {
    let service: RolesService;

    beforeEach(async () => {
        const { MailQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                {
                    provide: RolesRepository,
                    useValue: {
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findById: vi.fn(),
                        update: vi.fn(),
                        delete: vi.fn(),
                        findStaffContactsByRoleId: vi.fn().mockResolvedValue([]),
                        assignPermissions: vi.fn(),
                        removePermissions: vi.fn(),
                    },
                },
                {
                    provide: MailQueueService,
                    useValue: {
                        enqueueSend: vi.fn(),
                        enqueueSendMany: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
