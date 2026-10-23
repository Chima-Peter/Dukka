import { Module, forwardRef } from '@nestjs/common';
import { ProductModule } from '../product/product.module.js';
import { CartController } from './cart.controller.js';
import { CartRepository } from './cart.repository.js';
import { CartService } from './cart.service.js';

@Module({
    imports: [forwardRef(() => ProductModule)],
    controllers: [CartController],
    providers: [CartService, CartRepository],
    exports: [CartService, CartRepository],
})
export class CartModule {}
