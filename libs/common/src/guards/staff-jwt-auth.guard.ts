import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_TYPE_KEY } from '../decorators/auth-type.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type {
    JwtPayload,
    JwtSubjectType,
    StaffJwtPayload,
} from '../interfaces/jwt-payload.interface.js';
import { RedisService } from '../redis/redis.service.js';
import { REQUEST_USER_KEY, STAFF_JWT_SERVICE } from './auth.constants.js';
import {
    assertTokenNotBlacklisted,
    extractBearerToken,
} from './jwt-auth.utils.js';

@Injectable()
export class StaffJwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly redisService: RedisService,
        private readonly moduleRef: ModuleRef,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.isPublic(context) || this.authType(context) !== 'staff') {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const token = extractBearerToken(request);
        if (!token) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const staffJwtService = this.getStaffJwtService();
            const payload = await staffJwtService.verifyAsync<StaffJwtPayload>(
                token,
                {
                    algorithms: ['RS256'],
                },
            );

            if (payload.type !== 'staff' || payload.tokenUse !== 'access') {
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

    private getStaffJwtService(): JwtService {
        try {
            const service = this.moduleRef.get<JwtService>(STAFF_JWT_SERVICE, {
                strict: false,
            });
            if (!service) {
                throw new UnauthorizedException('Invalid or expired token');
            }
            return service;
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
