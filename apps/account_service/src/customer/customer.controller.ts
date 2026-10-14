import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CurrentCustomer,
  ResponseMessage,
  type CustomerJwtPayload,
} from '@app/common';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerService } from './customer.service.js';
import { ChangePasswordDto } from './dto/change_password.dto.js';
import { UpdateCustomerDTO } from './dto/update-customer.dto.js';

@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    private readonly customerService: CustomerService,
  ) {}

  @Get('me')
  @ResponseMessage('Customer profile retrieved successfully')
  getMe(@CurrentCustomer() customer: CustomerJwtPayload) {
    return this.customerService.getMe(customer.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(
    'Password changed successfully. Please login with your new password.',
  )
  changePassword(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Body() data: ChangePasswordDto,
  ) {
    return this.customerAuthService.changePassword(customer.sub, data);
  }

  @Patch()
  @ResponseMessage('Customer updated successfully')
  update(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Body() data: UpdateCustomerDTO,
  ) {
    return this.customerService.updateCustomerDetails(customer.sub, data);
  }
}
