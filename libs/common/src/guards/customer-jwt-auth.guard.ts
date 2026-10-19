import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_TYPE_KEY } from '../decorators/auth-type.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type {
    CustomerJwtPayload,
    JwtPayload,
    JwtSubjectType,
} from '../interfaces/jwt-payload.interface.js';
import { RedisService } from '../redis/redis.service.js';
import { REQUEST_USER_KEY } from './auth.constants.js';
import {
    assertTokenNotBlacklisted,
    extractBearerToken,
} from './jwt-auth.utils.js';

@Injectable()
export class CustomerJwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
        private readonly redisService: RedisService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.isPublic(context) || this.authType(context) !== 'customer') {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const token = extractBearerToken(request);
        if (!token) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const payload =
                await this.jwtService.verifyAsync<CustomerJwtPayload>(token, {
                    algorithms: ['RS256'],
                });

            if (payload.type !== 'customer') {
                throw new UnauthorizedException('Invalid or expired token');
            }

            await assertTokenNotBlacklisted(this.redisService, token);

            (request as Request & { [REQUEST_USER_KEY]: JwtPayload })[
                REQUEST_USER_KEY
            ] = payload;

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private isPublic(context: ExecutionContext): boolean {
        return (
            this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) === true
        );
    }

    private authType(context: ExecutionContext): JwtSubjectType | undefined {
        return this.reflector.getAllAndOverride<JwtSubjectType>(AUTH_TYPE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
    }
}
