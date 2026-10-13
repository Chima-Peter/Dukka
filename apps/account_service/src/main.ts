import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { ConfigType } from './config/env.interface.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useSecurityHeaders({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
  })
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  })
  app.enableCors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Last-Event-ID',],
    origin: ["http://localhost:3000"],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService<ConfigType, true>);
  const port = configService.getOrThrow('ACCOUNT_SERVICE_PORT', { infer: true });

  await app.listen(port);
}
await bootstrap();
