import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { InvitationsRepository } from './invitations.repository.js';
import { InvitationsService } from './invitations.service.js';

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

describe('InvitationsService', () => {
    let service: InvitationsService;
    let invitationsRepository: {
        create: ReturnType<typeof vi.fn>;
        accept: ReturnType<typeof vi.fn>;
        resend: ReturnType<typeof vi.fn>;
        cancel: ReturnType<typeof vi.fn>;
    };
    let mailQueueService: {
        enqueueSend: ReturnType<typeof vi.fn>;
    };
    let passwordHasher: {
        hash: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        const { MailQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );

        invitationsRepository = {
            create: vi.fn(),
            accept: vi.fn(),
            resend: vi.fn(),
            cancel: vi.fn(),
        };
        mailQueueService = {
            enqueueSend: vi.fn(),
        };
        passwordHasher = {
            hash: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvitationsService,
                {
                    provide: InvitationsRepository,
                    useValue: {
                        create: invitationsRepository.create,
                        findAll: vi.fn(),
                        findByIdInScope: vi.fn(),
                        cancel: invitationsRepository.cancel,
                        resend: invitationsRepository.resend,
                        accept: invitationsRepository.accept,
                    },
                },
                {
                    provide: PasswordHasher,
                    useValue: passwordHasher,
                },
                {
                    provide: MailQueueService,
                    useValue: mailQueueService,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: vi.fn().mockReturnValue(
                            'https://staff.dukka.test',
                        ),
                    },
                },
            ],
        }).compile();

        service = module.get<InvitationsService>(InvitationsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('invites staff and emails the invitation token', async () => {
        invitationsRepository.create.mockResolvedValue({
            id: 'inv-1',
            email: 'new@example.com',
            name: 'New Staff',
            phone_number: null,
            token: 'secret-token',
            plain_token: 'secret-token',
            status: 'PENDING',
            expires_at: new Date(),
            accepted_at: null,
            cancelled_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            role_id: 'role-1',
            invited_by_staff_id: 'staff-1',
            staff_id: null,
            role: {
                id: 'role-1',
                name: 'Support',
                hierarchy: 2,
                description: null,
            },
            invited_by: {
                id: 'staff-1',
                name: 'Admin',
                email: 'admin@example.com',
            },
            invitation_markets: [],
        });

        const result = await service.invite(
            {
                name: 'New Staff',
                email: 'new@example.com',
                role_id: 'role-1',
                market_ids: ['market-1'],
            },
            'staff-1',
        );

        expect(result).not.toHaveProperty('token');
        expect(result).not.toHaveProperty('plain_token');
        expect(mailQueueService.enqueueSend).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'new@example.com',
                template: 'staff.invitation',
                context: expect.objectContaining({
                    roleName: 'Support',
                    inviteUrl:
                        'https://staff.dukka.test/invitations/accept?token=secret-token',
                }),
            }),
        );
    });

    it('accepts an invitation, hashes the password, and sends welcome mail', async () => {
        passwordHasher.hash.mockResolvedValue('hashed');
        invitationsRepository.accept.mockResolvedValue({
            id: 'inv-1',
            email: 'new@example.com',
            name: 'New Staff',
            phone_number: null,
            token: 'secret-token',
            status: 'ACCEPTED',
            expires_at: new Date(),
            accepted_at: new Date(),
            cancelled_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            role_id: 'role-1',
            invited_by_staff_id: 'staff-1',
            staff_id: 'staff-2',
            role: {
                id: 'role-1',
                name: 'Support',
                hierarchy: 2,
                description: null,
            },
            invited_by: {
                id: 'staff-1',
                name: 'Admin',
                email: 'admin@example.com',
            },
            invitation_markets: [],
        });

        await expect(
            service.accept({
                email: 'new@example.com',
                token: 'secret-token',
                password: 'Str0ng!Password',
            }),
        ).resolves.toEqual({
            email: 'new@example.com',
            name: 'New Staff',
        });

        expect(passwordHasher.hash).toHaveBeenCalledWith('Str0ng!Password');
        expect(invitationsRepository.accept).toHaveBeenCalledWith(
            'new@example.com',
            'secret-token',
            'hashed',
        );
        expect(mailQueueService.enqueueSend).toHaveBeenCalledWith(
            expect.objectContaining({
                template: 'staff.welcome',
                to: 'new@example.com',
            }),
        );
    });

    it('resends an invitation with a new token email', async () => {
        invitationsRepository.resend.mockResolvedValue({
            id: 'inv-1',
            email: 'new@example.com',
            name: 'New Staff',
            phone_number: null,
            token: 'new-token',
            plain_token: 'new-token',
            status: 'PENDING',
            expires_at: new Date(),
            accepted_at: null,
            cancelled_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            role_id: 'role-1',
            invited_by_staff_id: 'staff-1',
            staff_id: null,
            role: {
                id: 'role-1',
                name: 'Support',
                hierarchy: 2,
                description: null,
            },
            invited_by: {
                id: 'staff-1',
                name: 'Admin',
                email: 'admin@example.com',
            },
            invitation_markets: [],
        });

        await service.resend('inv-1', 'staff-1');

        expect(invitationsRepository.resend).toHaveBeenCalledWith(
            'inv-1',
            'staff-1',
        );
        expect(mailQueueService.enqueueSend).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'new@example.com',
                template: 'staff.invitation',
                context: expect.objectContaining({
                    inviteUrl:
                        'https://staff.dukka.test/invitations/accept?token=new-token',
                }),
            }),
        );
    });
});
