import { Module } from '@nestjs/common';
import { ProductServiceController } from './product_service.controller.js';
import { ProductServiceService } from './product_service.service.js';

@Module({
  imports: [],
  controllers: [ProductServiceController],
  providers: [ProductServiceService],
})
export class ProductServiceModule {}
