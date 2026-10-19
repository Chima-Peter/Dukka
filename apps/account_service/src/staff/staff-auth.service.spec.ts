import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenType } from '../../generated/prisma/client.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffService } from './staff.service.js';
import { StaffTokenRepository } from './token.repository.js';

vi.mock('../../../../libs/common/src/index.ts', async () => {
    const { commonMock } = await import('./test/common.mock.js');
    return commonMock;
});
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
        STAFF_ROLE_UPDATED: 'staff.role-updated',
        STAFF_PERMISSIONS_CHANGED: 'staff.permissions-changed',
        STAFF_MARKETS_CHANGED: 'staff.markets-changed',
        MARKET_UPDATED: 'market.updated',
        MARKET_DELETED: 'market.deleted',
    },
    QueuesModule: class QueuesModule {},
}));

describe('StaffAuthService', () => {
    let service: StaffAuthService;
    let staffService: {
        findByEmail: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
        toPublicStaff: ReturnType<typeof vi.fn>;
        updatePassword: ReturnType<typeof vi.fn>;
        changePassword: ReturnType<typeof vi.fn>;
    };
    let staffJwtService: {
        signAsync: ReturnType<typeof vi.fn>;
        decode: ReturnType<typeof vi.fn>;
    };
    let passwordHasher: {
        hash: ReturnType<typeof vi.fn>;
        verify: ReturnType<typeof vi.fn>;
    };
    let redisService: {
        set: ReturnType<typeof vi.fn>;
        get: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };
    let tokenRepository: {
        create: ReturnType<typeof vi.fn>;
        deleteByToken: ReturnType<typeof vi.fn>;
        deleteAllByStaffId: ReturnType<typeof vi.fn>;
    };
    let permissionsService: {
        extractPermissionNames: ReturnType<typeof vi.fn>;
        cacheStaffPermissions: ReturnType<typeof vi.fn>;
    };
    let mailQueueService: {
        enqueueSend: ReturnType<typeof vi.fn>;
        enqueueSendMany: ReturnType<typeof vi.fn>;
    };

    const staffRecord = {
        id: 'staff-1',
        email: 'staff@example.com',
        name: 'Ada Staff',
        password: 'hashed-password',
        is_active: true,
        role_id: 'role-1',
        role: {
            name: 'Admin',
            hierarchy: 1,
            role_markets: [],
            role_permissions: [
                { permission: { name: 'staff:create' } },
                { permission: { name: 'staff:read' } },
            ],
        },
        staff_markets: [
            { market_id: 'market-1' },
            { market_id: 'market-2' },
        ],
        phone_number: null,
        avatar: null,
        profile: null,
        qualifications: [],
        created_at: new Date(),
        updated_at: new Date(),
    };

    const publicStaff = {
        id: 'staff-1',
        email: 'staff@example.com',
        name: 'Ada Staff',
        avatar: null,
        role_id: 'role-1',
        role: staffRecord.role,
        phone_number: null,
        is_active: true,
        profile: null,
        qualifications: [],
        created_at: staffRecord.created_at,
        updated_at: staffRecord.updated_at,
    };

    beforeEach(async () => {
        staffService = {
            findByEmail: vi.fn(),
            findOne: vi.fn(),
            toPublicStaff: vi.fn(),
            updatePassword: vi.fn(),
            changePassword: vi.fn(),
        };
        staffJwtService = {
            signAsync: vi.fn(),
            decode: vi.fn(),
        };
        passwordHasher = {
            hash: vi.fn(),
            verify: vi.fn(),
        };
        redisService = {
            set: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
        };
        tokenRepository = {
            create: vi.fn(),
            deleteByToken: vi.fn(),
            deleteAllByStaffId: vi.fn(),
        };
        permissionsService = {
            extractPermissionNames: vi.fn(),
            cacheStaffPermissions: vi.fn(),
        };
        mailQueueService = {
            enqueueSend: vi.fn(),
            enqueueSendMany: vi.fn(),
        };

        const { MailQueueService } = await import(
            '../../../../libs/queues/src/index.ts'
        );
        const common = await import('../../../../libs/common/src/index.ts');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaffAuthService,
                { provide: StaffService, useValue: staffService },
                {
                    provide: common.STAFF_JWT_SERVICE,
                    useValue: staffJwtService,
                },
                { provide: PasswordHasher, useValue: passwordHasher },
                { provide: common.RedisService, useValue: redisService },
                { provide: StaffTokenRepository, useValue: tokenRepository },
                {
                    provide: PermissionsService,
                    useValue: permissionsService,
                },
                { provide: MailQueueService, useValue: mailQueueService },
            ],
        }).compile();

        service = module.get<StaffAuthService>(StaffAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('returns access token and public staff', async () => {
            staffService.findByEmail.mockResolvedValue(staffRecord);
            passwordHasher.verify.mockResolvedValue(true);
            staffService.toPublicStaff.mockReturnValue(publicStaff);
            staffJwtService.signAsync.mockResolvedValue('staff.jwt.token');
            permissionsService.extractPermissionNames.mockReturnValue([
                'staff:create',
                'staff:read',
            ]);
            permissionsService.cacheStaffPermissions.mockResolvedValue(
                undefined,
            );
            tokenRepository.create.mockResolvedValue({ id: 'token-1' });

            const result = await service.login({
                email: 'staff@example.com',
                password: 'plain-password',
            });

            expect(result).toEqual({
                accessToken: 'staff.jwt.token',
                staff: publicStaff,
            });
            expect(staffJwtService.signAsync).toHaveBeenCalledWith(
                {
                    sub: 'staff-1',
                    email: 'staff@example.com',
                    type: 'staff',
                    name: 'Ada Staff',
                    role_id: 'role-1',
                    role_name: 'Admin',
                    hierarchy: 1,
                    market_ids: ['market-1', 'market-2'],
                },
                { expiresIn: expect.any(Number) },
            );
            expect(tokenRepository.create).toHaveBeenCalledWith({
                token: 'staff.jwt.token',
                type: TokenType.ACCESS,
                staffId: 'staff-1',
            });
            expect(
                permissionsService.cacheStaffPermissions,
            ).toHaveBeenCalledWith('staff-1', ['staff:create', 'staff:read']);
        });

        it('rejects inactive staff', async () => {
            staffService.findByEmail.mockResolvedValue({
                ...staffRecord,
                is_active: false,
            });

            await expect(
                service.login({
                    email: 'staff@example.com',
                    password: 'plain-password',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
            expect(passwordHasher.verify).not.toHaveBeenCalled();
        });

        it('rejects invalid password', async () => {
            staffService.findByEmail.mockResolvedValue(staffRecord);
            passwordHasher.verify.mockResolvedValue(false);

            await expect(
                service.login({
                    email: 'staff@example.com',
                    password: 'wrong-password',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });

    describe('logout', () => {
        it('deletes token and blacklists it', async () => {
            tokenRepository.deleteByToken.mockResolvedValue(1);
            staffJwtService.decode.mockReturnValue({
                exp: Math.floor(Date.now() / 1000) + 3600,
            });

            await service.logout('staff-1', 'staff.jwt.token');

            expect(tokenRepository.deleteByToken).toHaveBeenCalledWith(
                'staff-1',
                'staff.jwt.token',
            );
            expect(redisService.set).toHaveBeenCalledWith(
                'blacklisted:token:staff.jwt.token',
                '1',
                expect.any(Number),
            );
        });

        it('rejects missing token records', async () => {
            tokenRepository.deleteByToken.mockResolvedValue(0);

            await expect(
                service.logout('staff-1', 'missing.token'),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });

    describe('initiatePasswordReset', () => {
        it('stores a reset token for an existing staff member', async () => {
            staffService.findByEmail.mockResolvedValue(staffRecord);

            const result = await service.initiatePasswordReset({
                email: 'staff@example.com',
            });

            expect(result.token).toMatch(/^\d{6}$/);
            expect(redisService.set).toHaveBeenCalledWith(
                'staff_password_reset:token:staff@example.com',
                result.token,
                expect.any(Number),
            );
            expect(mailQueueService.enqueueSend).toHaveBeenCalled();
        });

        it('rejects unknown staff', async () => {
            staffService.findByEmail.mockResolvedValue(null);

            await expect(
                service.initiatePasswordReset({ email: 'missing@example.com' }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
