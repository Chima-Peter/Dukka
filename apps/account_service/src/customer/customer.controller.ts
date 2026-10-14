import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentCustomer,
  JwtAuthGuard,
  ResponseMessage,
  type CustomerJwtPayload,
} from '@app/common';
import { CustomerAuthService } from './customer-auth.service.js';
import { ChangePasswordDto } from './dto/change_password.dto.js';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
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
}
