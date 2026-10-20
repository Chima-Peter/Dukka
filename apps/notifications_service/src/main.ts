import { NestFactory } from '@nestjs/core';
import { NotificationsServiceModule } from './notifications_service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsServiceModule);
  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
