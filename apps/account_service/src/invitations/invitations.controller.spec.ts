import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commonMock } from '../staff/test/common.mock.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => commonMock);
vi.mock('../../../../libs/queues/src/index.ts', () => ({
    MailQueueService: class MailQueueService {},
    MAIL_QUEUE: 'mail',
    MAIL_JOBS: { SEND: 'send' },
    MAIL_TEMPLATES: {
        STAFF_WELCOME: 'staff.welcome',
        STAFF_INVITATION: 'staff.invitation',
    },
    QueuesModule: class QueuesModule {},
}));

describe('InvitationsController', () => {
    let controller: InvitationsController;
    let invitationsService: {
        invite: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
        cancel: ReturnType<typeof vi.fn>;
        resend: ReturnType<typeof vi.fn>;
        accept: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        invitationsService = {
            invite: vi.fn(),
            findAll: vi.fn(),
            findOne: vi.fn(),
            cancel: vi.fn(),
            resend: vi.fn(),
            accept: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [InvitationsController],
            providers: [
                {
                    provide: InvitationsService,
                    useValue: invitationsService,
                },
            ],
        }).compile();

        controller = module.get(InvitationsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('delegates invite to the service', async () => {
        invitationsService.invite.mockResolvedValue({ id: 'inv-1' });

        await expect(
            controller.invite(
                {
                    sub: 'staff-1',
                    email: 'admin@example.com',
                    type: 'staff',
                    name: 'Admin',
                    role_id: 'role-1',
                    role_name: 'Admin',
                    hierarchy: 0,
                    market_ids: ['market-1'],
                },
                {
                    name: 'New',
                    email: 'new@example.com',
                    role_id: 'role-2',
                    market_ids: ['market-1'],
                },
            ),
        ).resolves.toEqual({ id: 'inv-1' });

        expect(invitationsService.invite).toHaveBeenCalledWith(
            {
                name: 'New',
                email: 'new@example.com',
                role_id: 'role-2',
                market_ids: ['market-1'],
            },
            'staff-1',
        );
    });

    it('delegates cancel and resend to the service', async () => {
        invitationsService.cancel.mockResolvedValue({ id: 'inv-1' });
        invitationsService.resend.mockResolvedValue({ id: 'inv-1' });

        const staff = {
            sub: 'staff-1',
            email: 'admin@example.com',
            type: 'staff' as const,
            name: 'Admin',
            role_id: 'role-1',
            role_name: 'Admin',
            hierarchy: 0,
            market_ids: ['market-1'],
        };

        await expect(controller.cancel(staff, 'inv-1')).resolves.toEqual({
            id: 'inv-1',
        });
        await expect(controller.resend(staff, 'inv-1')).resolves.toEqual({
            id: 'inv-1',
        });
        expect(invitationsService.cancel).toHaveBeenCalledWith(
            'inv-1',
            'staff-1',
        );
        expect(invitationsService.resend).toHaveBeenCalledWith(
            'inv-1',
            'staff-1',
        );
    });

    it('delegates accept to the service', async () => {
        invitationsService.accept.mockResolvedValue({
            email: 'new@example.com',
            name: 'New',
        });

        await expect(
            controller.accept({
                email: 'new@example.com',
                token: 'token',
                password: 'Str0ng!Password',
            }),
        ).resolves.toEqual({
            email: 'new@example.com',
            name: 'New',
        });
    });
});
