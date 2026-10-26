import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { JwtSubjectType } from '../interfaces/jwt-payload.interface.js';

export const AUTH_TYPE_KEY = 'authType';

export const Auth = (type: JwtSubjectType) =>
    applyDecorators(SetMetadata(AUTH_TYPE_KEY, type), ApiBearerAuth());
