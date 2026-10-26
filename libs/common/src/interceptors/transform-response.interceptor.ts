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

const SSE_METADATA_KEY = '__sse__';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T> | T
> {
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<ApiResponse<T> | T> {
        const isSse = this.reflector.getAllAndOverride<boolean>(
            SSE_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isSse) {
            return next.handle();
        }

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
