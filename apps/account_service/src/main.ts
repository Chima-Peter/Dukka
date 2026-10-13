import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module.js';
import type { ConfigType } from './config/env.interface.js';

async function bootstrap() {
  const context = await NestFactory.createApplicationContext(AppModule);
  const configService = context.get(ConfigService<ConfigType, true>);
  const port = configService.getOrThrow('ACCOUNT_SERVICE_PORT', { infer: true });
  await context.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port,
      },
    },
  );

  await app.listen();
}
await bootstrap();
