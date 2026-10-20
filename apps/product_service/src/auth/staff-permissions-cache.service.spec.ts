import {
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { getHttpClientToken } from '@nestjs/http-client';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_HTTP_CLIENT } from '../shared/account-http.constants.js';
import { StaffPermissionsCacheService } from './staff-permissions-cache.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    RedisService: class RedisService {},
}));

describe('StaffPermissionsCacheService', () => {
    let service: StaffPermissionsCacheService;
    let redisService: {
        getObject: ReturnType<typeof vi.fn>;
    };
    let accountHttp: {
        get: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        const { RedisService } = await import(
            '../../../../libs/common/src/index.ts'
        );

        redisService = {
            getObject: vi.fn(),
        };
        accountHttp = {
            get: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaffPermissionsCacheService,
                {
                    provide: RedisService,
                    useValue: redisService,
                },
                {
                    provide: getHttpClientToken(ACCOUNT_HTTP_CLIENT),
                    useValue: accountHttp,
                },
            ],
        }).compile();

        service = module.get(StaffPermissionsCacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('returns cached permissions without calling account service', async () => {
        redisService.getObject.mockResolvedValue(['staff:read']);

        await expect(
            service.getStaffPermissions('staff-1'),
        ).resolves.toEqual(['staff:read']);
        expect(accountHttp.get).not.toHaveBeenCalled();
    });

    it('throws when cache misses and no access token is provided', async () => {
        redisService.getObject.mockResolvedValue(null);

        await expect(service.getStaffPermissions('staff-1')).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('fetches permissions from account service on cache miss', async () => {
        redisService.getObject.mockResolvedValue(null);
        accountHttp.get.mockResolvedValue({
            data: { success: true, data: ['staff:read', 'roles:read'] },
        });

        await expect(
            service.getStaffPermissions('staff-1', 'token'),
        ).resolves.toEqual(['staff:read', 'roles:read']);
        expect(accountHttp.get).toHaveBeenCalledWith(
            '/permissions/staff/:staffId',
            {
                params: { staffId: 'staff-1' },
                headers: {
                    Authorization: 'Bearer token',
                    Accept: 'application/json',
                },
            },
        );
    });

    it('throws when account service returns an unsuccessful payload', async () => {
        redisService.getObject.mockResolvedValue(null);
        accountHttp.get.mockResolvedValue({
            data: { success: false, data: null },
        });

        await expect(
            service.getStaffPermissions('staff-1', 'token'),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
});
