import { Body, Controller, Post } from '@nestjs/common';
import { CustomerService } from './customer.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { LoginCustomerDto } from './dto/login-customer.dto.js';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Body() data: CreateCustomerDto) {
    return this.customerService.create(data);
  }

  @Post('login')
  login(@Body() data: LoginCustomerDto) {
    return this.customerService.login(data);
  }
}
