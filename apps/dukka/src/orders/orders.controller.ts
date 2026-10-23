import { Controller } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}
}
