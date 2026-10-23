import { Module, forwardRef } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module.js';
import { MarketsModule } from '../markets/markets.module.js';
import { ProductController } from './product.controller.js';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';

@Module({
    imports: [MarketsModule, forwardRef(() => CustomerModule)],
    controllers: [ProductController],
    providers: [ProductService, ProductRepository],
    exports: [ProductService, ProductRepository],
})
export class ProductModule {}
