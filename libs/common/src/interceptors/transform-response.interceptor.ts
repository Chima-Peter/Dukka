import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY, SSE_METADATA_KEY } from '../decorators/index.js';
import { successResponse, type ApiResponse } from '../response/index.js';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T> | T
> {
    private readonly logger = new Logger(TransformResponseInterceptor.name);
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
            this.logger.log('SSE response detected');
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
