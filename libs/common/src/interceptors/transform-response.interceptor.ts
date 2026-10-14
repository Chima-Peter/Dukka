import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/index.js';
import { successResponse, type ApiResponse } from '../response/index.js';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T>
> {
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<ApiResponse<T>> {
        const message =
            this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ?? 'Success';

        return next
            .handle()
            .pipe(map((data) => successResponse(data, message)));
    }
}
