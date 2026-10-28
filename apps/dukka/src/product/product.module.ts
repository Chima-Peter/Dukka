import { Module, forwardRef } from '@nestjs/common';
import { CategoryModule } from '../category/category.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { MarketsModule } from '../markets/markets.module.js';
import { ProductController } from './product.controller.js';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';
import { ProductVariantController } from './product-variant.controller.js';
import { ProductVariantRepository } from './product-variant.repository.js';
import { ProductVariantService } from './product-variant.service.js';

@Module({
    imports: [CategoryModule, MarketsModule, forwardRef(() => CustomerModule)],
    controllers: [ProductController, ProductVariantController],
    providers: [
        ProductService,
        ProductRepository,
        ProductVariantService,
        ProductVariantRepository,
    ],
    exports: [
        ProductService,
        ProductRepository,
        ProductVariantService,
        ProductVariantRepository,
    ],
})
export class ProductModule {}
