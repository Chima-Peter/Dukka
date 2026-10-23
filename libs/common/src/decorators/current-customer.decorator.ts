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

type CurrentCustomerData =
    | keyof CustomerJwtPayload
    | { optional?: boolean }
    | undefined;

export const CurrentCustomer = createParamDecorator(
    (
        data: CurrentCustomerData,
        ctx: ExecutionContext,
    ): CustomerJwtPayload | CustomerJwtPayload[keyof CustomerJwtPayload] | undefined => {
        const request = ctx
            .switchToHttp()
            .getRequest<Request & { [REQUEST_USER_KEY]?: JwtPayload }>();
        const user = request[REQUEST_USER_KEY];
        const optional =
            typeof data === 'object' && data !== null
                ? data.optional === true
                : false;

        if (!user || user.type !== 'customer') {
            if (optional) {
                return undefined;
            }
            throw new UnauthorizedException('Customer authentication required');
        }

        if (typeof data === 'string') {
            return user[data];
        }

        return user;
    },
);
