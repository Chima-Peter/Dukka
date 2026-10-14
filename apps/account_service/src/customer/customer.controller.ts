import {
  Body,
  Controller,
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
