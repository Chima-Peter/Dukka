import { ConsoleLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import type { ConfigType } from './config/env.interface.js';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        rawBody: true,
        instrument: ObserveInstrument,
        logger: new ConsoleLogger({
            json: true,
            colors: true,
            logLevels: ['log', 'warn', 'error', 'fatal'],
        }),
    });
    const configService = app.get(ConfigService<ConfigType, true>);
    const corsOrigins = configService
        .getOrThrow('CORS_ORIGINS', { infer: true })
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    const csrfExclude = configService
        .getOrThrow('CSRF_EXCLUDE', { infer: true })
        .split(',')
        .map((path) => path.trim())
        .filter(Boolean);

    app.set(
        'trust proxy',
        configService.getOrThrow('TRUST_PROXY', { infer: true }),
    );
    app.enableCsrfProtection({
        exclude: csrfExclude,
        trustedOrigins: corsOrigins,
    });
    app.useSecurityHeaders({
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
    });
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1/dukka',
        prefix: 'api/v',
    });

    app.enableCors({
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Last-Event-ID',
            'X-Request-ID',
            'X-Idempotency-Key',
            'X-Refresh-Token',
        ],
        origin: corsOrigins,
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

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Dukka API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    SwaggerModule.setup(
        'docs',
        app,
        SwaggerModule.createDocument(app, swaggerConfig),
    );

    app.enableShutdownHooks();

    const port = configService.getOrThrow('DUKKA_PORT', {
        infer: true,
    });

    await app.listen(port);
}
await bootstrap();
