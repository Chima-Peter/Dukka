import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { toHttpException } from '@nestjs/http-client';
import type { Response } from 'express';
import { errorResponse } from '../response/index.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();
        const resolved = toHttpException(exception);

        if (resolved instanceof HttpException) {
            const statusCode = resolved.getStatus();
            const exceptionResponse = resolved.getResponse();
            const rawMessage =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : ((exceptionResponse as { message?: string | string[] })
                          .message ?? resolved.message);
            const message = Array.isArray(rawMessage)
                ? rawMessage.join(', ')
                : rawMessage;

            response.status(statusCode).json(errorResponse(message));
            return;
        }

        response
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json(
                errorResponse(
                    resolved instanceof Error
                        ? resolved.message
                        : 'Internal server error',
                ),
            );
    }
}
