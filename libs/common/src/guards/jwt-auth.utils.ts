import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { RedisService } from '../redis/redis.service.js';
import { blacklistedTokenKey } from './auth.constants.js';

export function extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
        return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
}

export async function assertTokenNotBlacklisted(
    redisService: RedisService,
    token: string,
): Promise<void> {
    const isBlacklisted = await redisService.exists(blacklistedTokenKey(token));
    if (isBlacklisted) {
        throw new UnauthorizedException('Invalid or expired token');
    }
}
