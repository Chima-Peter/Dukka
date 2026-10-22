import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    Public,
    ResponseMessage,
} from '@app/common';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { AddGuestCartItemDto } from './dto/add-guest-cart-item.dto.js';
import { DeleteCartItemsDto } from './dto/delete-cart-items.dto.js';
import { DeleteGuestCartItemsDto } from './dto/delete-guest-cart-items.dto.js';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto.js';
import { UpdateGuestCartItemQuantityDto } from './dto/update-guest-cart-item-quantity.dto.js';

@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get('total')
    @Auth('customer')
    @ResponseMessage('Cart total calculated successfully')
    getTotal(@CurrentCustomer('cart_id') cartId: string) {
        return this.cartService.getTotalForCustomer(cartId);
    }

    @Get('guest/:id/total')
    @Public()
    @ResponseMessage('Cart total calculated successfully')
    getGuestTotal(@Param('id', ParseUUIDPipe) id: string) {
        return this.cartService.getTotalForGuest(id);
    }

    @Post('items')
    @Auth('customer')
    @ResponseMessage('Item added to cart successfully')
    addItem(
        @CurrentCustomer('cart_id') cartId: string,
        @Body() data: AddCartItemDto,
    ) {
        return this.cartService.addItemForCustomer(cartId, data);
    }

    @Post('guest/items')
    @Public()
    @ResponseMessage('Item added to guest cart successfully')
    addGuestItem(@Body() data: AddGuestCartItemDto) {
        return this.cartService.addItemForGuest(data);
    }

    @Patch('items/:id')
    @Auth('customer')
    @ResponseMessage('Cart item quantity updated successfully')
    updateQuantity(
        @CurrentCustomer('cart_id') cartId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCartItemQuantityDto,
    ) {
        return this.cartService.updateItemQuantityForCustomer(
            cartId,
            id,
            data,
        );
    }

    @Patch('guest/items/:id')
    @Public()
    @ResponseMessage('Cart item quantity updated successfully')
    updateGuestQuantity(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateGuestCartItemQuantityDto,
    ) {
        return this.cartService.updateItemQuantityForGuest(id, data);
    }

    @Delete('items')
    @Auth('customer')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Cart items deleted successfully')
    deleteItems(
        @CurrentCustomer('cart_id') cartId: string,
        @Body() data: DeleteCartItemsDto,
    ) {
        return this.cartService.deleteItemsForCustomer(cartId, data);
    }

    @Delete('guest/items')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Cart items deleted successfully')
    deleteGuestItems(@Body() data: DeleteGuestCartItemsDto) {
        return this.cartService.deleteItemsForGuest(data);
    }
}
