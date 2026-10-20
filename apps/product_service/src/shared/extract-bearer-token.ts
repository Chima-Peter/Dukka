import { UnauthorizedException } from '@nestjs/common';

export function extractBearerToken(authorization?: string): string {
    if (!authorization) {
        throw new UnauthorizedException('Missing authentication token');
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Missing authentication token');
    }

    return token;
}
