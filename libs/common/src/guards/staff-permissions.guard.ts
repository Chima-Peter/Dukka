import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_TYPE_KEY } from '../decorators/auth-type.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import type {
    JwtPayload,
    JwtSubjectType,
} from '../interfaces/jwt-payload.interface.js';
import {
    REQUEST_USER_KEY,
    STAFF_PERMISSIONS_SERVICE,
    type StaffPermissionsReader,
} from './auth.constants.js';
import { extractBearerToken } from './jwt-auth.utils.js';

@Injectable()
export class StaffPermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(STAFF_PERMISSIONS_SERVICE)
        private readonly staffPermissionsService: StaffPermissionsReader,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.requiredPermissions(context);
        if (
            requiredPermissions.length === 0 ||
            this.isPublic(context) ||
            this.authType(context) !== 'staff'
        ) {
            return true;
        }

        const request = context.switchToHttp().getRequest<
            Request & { [REQUEST_USER_KEY]?: JwtPayload }
        >();
        const staff = request[REQUEST_USER_KEY];

        if (!staff || staff.type !== 'staff') {
            throw new UnauthorizedException('Missing authentication token');
        }

        const accessToken = extractBearerToken(request);
        const permissions =
            await this.staffPermissionsService.getStaffPermissions(
                staff.sub,
                accessToken,
            );
        const hasPermission = requiredPermissions.every((permission) =>
            permissions.includes(permission),
        );

        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }

    private requiredPermissions(context: ExecutionContext): string[] {
        return (
            this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ?? []
        );
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
