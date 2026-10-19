import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST_USER_KEY } from '../guards/auth.constants.js';
import type {
    CustomerJwtPayload,
    JwtPayload,
} from '../interfaces/jwt-payload.interface.js';

export const CurrentCustomer = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): CustomerJwtPayload => {
        const request = ctx
            .switchToHttp()
            .getRequest<Request & { [REQUEST_USER_KEY]?: JwtPayload }>();
        const user = request[REQUEST_USER_KEY];

        if (!user || user.type !== 'customer') {
            throw new UnauthorizedException('Customer authentication required');
        }

        return user;
    },
);
