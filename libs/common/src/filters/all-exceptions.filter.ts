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

            if (
                statusCode === HttpStatus.SERVICE_UNAVAILABLE &&
                this.isHealthCheckResult(exceptionResponse)
            ) {
                response.status(statusCode).json(exceptionResponse);
                return;
            }

            const rawMessage =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : ((exceptionResponse as { message?: string | string[] })
                          .message ?? resolved.message);
            const message = Array.isArray(rawMessage)
                ? rawMessage.join(', ')
                : rawMessage;
            const data = this.extractErrorData(exceptionResponse);

            response.status(statusCode).json(errorResponse(message, data));
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

    private extractErrorData(exceptionResponse: string | object): unknown {
        if (
            typeof exceptionResponse !== 'object' ||
            exceptionResponse === null ||
            Array.isArray(exceptionResponse)
        ) {
            return null;
        }

        const {
            message: _message,
            error: _error,
            statusCode: _statusCode,
            ...rest
        } = exceptionResponse as Record<string, unknown>;

        return Object.keys(rest).length > 0 ? rest : null;
    }

    private isHealthCheckResult(exceptionResponse: string | object): boolean {
        if (
            typeof exceptionResponse !== 'object' ||
            exceptionResponse === null ||
            Array.isArray(exceptionResponse)
        ) {
            return false;
        }

        const body = exceptionResponse as Record<string, unknown>;
        const terminusStatuses = new Set([
            'ok',
            'error',
            'degraded',
            'shutting_down',
        ]);

        return (
            typeof body.status === 'string' &&
            terminusStatuses.has(body.status) &&
            typeof body.info === 'object' &&
            body.info !== null &&
            typeof body.error === 'object' &&
            body.error !== null &&
            typeof body.details === 'object' &&
            body.details !== null &&
            !('statusCode' in body)
        );
    }
}
