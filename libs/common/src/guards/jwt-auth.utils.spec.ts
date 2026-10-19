import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../redis/redis.service.js';
import {
    assertTokenNotBlacklisted,
    extractBearerToken,
} from './jwt-auth.utils.js';

describe('jwt-auth.utils', () => {
    describe('extractBearerToken', () => {
        it('returns the token from a bearer header', () => {
            expect(
                extractBearerToken({
                    headers: { authorization: 'Bearer abc.def.ghi' },
                } as never),
            ).toBe('abc.def.ghi');
        });

        it('returns undefined for missing or non-bearer headers', () => {
            expect(extractBearerToken({ headers: {} } as never)).toBeUndefined();
            expect(
                extractBearerToken({
                    headers: { authorization: 'Basic abc' },
                } as never),
            ).toBeUndefined();
        });
    });

    describe('assertTokenNotBlacklisted', () => {
        let redisService: { exists: ReturnType<typeof vi.fn> };

        beforeEach(() => {
            redisService = { exists: vi.fn() };
        });

        it('allows tokens that are not blacklisted', async () => {
            redisService.exists.mockResolvedValue(false);

            await expect(
                assertTokenNotBlacklisted(
                    redisService as unknown as RedisService,
                    'good.token',
                ),
            ).resolves.toBeUndefined();
            expect(redisService.exists).toHaveBeenCalledWith(
                'blacklisted:token:good.token',
            );
        });

        it('rejects blacklisted tokens', async () => {
            redisService.exists.mockResolvedValue(true);

            await expect(
                assertTokenNotBlacklisted(
                    redisService as unknown as RedisService,
                    'bad.token',
                ),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });
});
