import { ConsoleLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule, ObserveInstrument } from './app.module.js';
import type { ConfigType } from './config/env.interface.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        instrument: ObserveInstrument,
        logger: new ConsoleLogger({
            json: true,
            colors: true,
            logLevels: ['log', 'warn', 'error', 'fatal'],
        }),
    });
    app.useSecurityHeaders({
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
    });
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1/products',
        prefix: 'api/v',
    });
    app.enableCors({
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Last-Event-ID',
            'X-Request-ID',
        ],
        origin: ['http://localhost:3000'],
        exposedHeaders: ['X-Request-ID'],
        credentials: true,
    });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
        }),
    );

    const configService = app.get(ConfigService<ConfigType, true>);
    const port = configService.getOrThrow('PRODUCT_SERVICE_PORT', {
        infer: true,
    });

    await app.listen(port);
}
await bootstrap();
