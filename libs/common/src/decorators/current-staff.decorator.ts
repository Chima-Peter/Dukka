import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST_USER_KEY } from '../guards/auth.constants.js';
import type {
    JwtPayload,
    StaffJwtPayload,
} from '../interfaces/jwt-payload.interface.js';

export const CurrentStaff = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): StaffJwtPayload => {
        const request = ctx
            .switchToHttp()
            .getRequest<Request & { [REQUEST_USER_KEY]?: JwtPayload }>();
        const user = request[REQUEST_USER_KEY];

        if (!user || user.type !== 'staff') {
            throw new UnauthorizedException('Staff authentication required');
        }

        return user;
    },
);
