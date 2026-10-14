import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentCustomer,
  JwtAuthGuard,
  ResponseMessage,
  type CustomerJwtPayload,
} from '@app/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CreateCustomerDto } from '../customer/dto/create-customer.dto.js';
import { InitiatePasswordResetDto } from './dto/initiate_password_reset.dto.js';
import { VerifyPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import {
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_VERIFIED_TTL_SECONDS,
} from '../shared/redis.constants.js';
import { ResetPasswordDTO } from './dto/reset_password.dto.js';
import { ChangePasswordDto } from './dto/change_password.dto.js';

@Controller('authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('Customer created successfully')
  register(@Body() data: CreateCustomerDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @ResponseMessage('Login successful')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logout successful')
  logout(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = this.extractBearerToken(authorization);
    if (!accessToken) {
      throw new UnauthorizedException('Missing authentication token');
    }

    return this.authService.logout(customer.sub, accessToken);
  }

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
    return this.authService.change_password(customer.sub, data);
  }

  @Post('password-reset/initiate')
  @ResponseMessage(
    `Password reset initiated. Please check your email for the reset token. It will expire in ${PASSWORD_RESET_TOKEN_TTL_SECONDS / 60} minutes.`
  )
  initiatePasswordReset(@Body() data: InitiatePasswordResetDto) {
    return this.authService.initiate_password_reset(data);
  }

  @Post('password-reset/verify')
  @ResponseMessage(
    `Password reset verified. This password reset is available for ${PASSWORD_RESET_VERIFIED_TTL_SECONDS / 60} minute.`
  )
  @HttpCode(HttpStatus.OK)
  verifyPasswordReset(@Body() data: VerifyPasswordResetTokenDto) {
    return this.authService.verify_password_reset(data);
  }

  @Post('password-reset/reset')
  @ResponseMessage('Password reset successful. You can now login with your new password.')
  resetPassword(@Body() data: ResetPasswordDTO) {
    return this.authService.reset_password(data);
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
