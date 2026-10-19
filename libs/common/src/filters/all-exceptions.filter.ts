import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { HttpClientError, toHttpException } from '@nestjs/http-client';
import type { Response } from 'express';
import { errorResponse } from '../response/index.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();

        if (exception instanceof HttpClientError) {
            exception = toHttpException(exception);
        }

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            const rawMessage =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : ((exceptionResponse as { message?: string | string[] })
                          .message ?? exception.message);
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
                    exception instanceof Error
                        ? exception.message
                        : 'Internal server error',
                ),
            );
    }
}
