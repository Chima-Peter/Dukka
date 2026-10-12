import { NestFactory } from '@nestjs/core';
import { ProductServiceModule } from './product_service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(ProductServiceModule);
  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
