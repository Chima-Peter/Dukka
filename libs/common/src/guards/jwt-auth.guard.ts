import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { REQUEST_USER_KEY, STAFF_JWT_SERVICE } from './auth.constants.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly jwtService: JwtService;
    private readonly reflector: Reflector;
    private readonly moduleRef: ModuleRef;

    constructor(
        jwtService: JwtService,
        reflector: Reflector,
        moduleRef: ModuleRef,
    ) {
        this.jwtService = jwtService;
        this.reflector = reflector;
        this.moduleRef = moduleRef;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractBearerToken(request);

        if (!token) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const payload = await this.verifyToken(token);

            (request as Request & { [REQUEST_USER_KEY]: JwtPayload })[
                REQUEST_USER_KEY
            ] = payload;

            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private async verifyToken(token: string): Promise<JwtPayload> {
        const decoded = this.jwtService.decode<JwtPayload>(token);

        if (decoded?.type === 'staff') {
            const staffJwtService = this.getStaffJwtService();
            if (!staffJwtService) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            return staffJwtService.verifyAsync<JwtPayload>(token, {
                algorithms: ['RS256'],
            });
        }

        return this.jwtService.verifyAsync<JwtPayload>(token, {
            algorithms: ['RS256'],
        });
    }

    private getStaffJwtService(): JwtService | undefined {
        try {
            return this.moduleRef.get<JwtService>(STAFF_JWT_SERVICE, {
                strict: false,
            });
        } catch {
            return undefined;
        }
    }

    private extractBearerToken(request: Request): string | undefined {
        const authorization = request.headers.authorization;
        if (!authorization) {
            return undefined;
        }

        const [type, token] = authorization.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}
