import { SetMetadata } from '@nestjs/common';
import type { JwtSubjectType } from '../interfaces/jwt-payload.interface.js';

export const AUTH_TYPE_KEY = 'authType';

export const Auth = (type: JwtSubjectType) => SetMetadata(AUTH_TYPE_KEY, type);
