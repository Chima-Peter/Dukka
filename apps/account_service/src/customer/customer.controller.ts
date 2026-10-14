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
import { ACCOUNT_DELETION_TOKEN_TTL_SECONDS } from '../shared/redis.constants.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerService } from './customer.service.js';
import { ChangePasswordDto } from './dto/change_password.dto.js';
import { UpdateCustomerDTO } from './dto/update-customer.dto.js';
import { VerifyAccountDeletionDto } from './dto/verify_account_deletion.dto.js';

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

  @Post('delete/initiate')
  @ResponseMessage(
    `Account deletion initiated. Please check your email for the confirmation token. It will expire in ${ACCOUNT_DELETION_TOKEN_TTL_SECONDS / 60} minutes.`,
  )
  initiateAccountDeletion(@CurrentCustomer() customer: CustomerJwtPayload) {
    return this.customerService.initiateAccountDeletion(customer.sub);
  }

  @Post('delete/verify')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Account deleted successfully')
  verifyAccountDeletion(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Body() data: VerifyAccountDeletionDto,
  ) {
    return this.customerService.verifyAccountDeletion(customer.sub, data);
  }
}
