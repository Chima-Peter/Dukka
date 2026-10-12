import { NestFactory } from '@nestjs/core';
import { AccountServiceModule } from './account_service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AccountServiceModule);
  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
