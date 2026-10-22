import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    Public,
    ResponseMessage,
    type CustomerJwtPayload,
} from '@app/common';
import { CustomerAuthService } from './customer-auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { InitiatePasswordResetDto } from './dto/initiate_password_reset.dto.js';
import { VerifyPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import {
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
    PASSWORD_RESET_VERIFIED_TTL_SECONDS,
} from '../shared/redis.constants.js';
import { ResetPasswordDTO } from './dto/reset_password.dto.js';

@Auth('customer')
@Controller('authentication/customer')
export class CustomerAuthController {
    constructor(private readonly customerAuthService: CustomerAuthService) {}

    @Post('register')
    @Public()
    @ResponseMessage('Customer created successfully')
    register(@Body() data: CreateCustomerDto) {
        return this.customerAuthService.register(data);
    }

    @Post('login')
    @Public()
    @ResponseMessage('Login successful')
    login(@Body() data: LoginDto) {
        return this.customerAuthService.login(data);
    }

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Tokens refreshed successfully')
    refresh(@Headers('x-refresh-token') refreshToken?: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Missing refresh token');
        }

        return this.customerAuthService.refresh(refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Logout successful')
    logout(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Headers('authorization') authorization?: string,
        @Headers('x-refresh-token') refreshToken?: string,
    ) {
        const accessToken = this.extractBearerToken(authorization);
        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }
        if (!refreshToken) {
            throw new UnauthorizedException('Missing refresh token');
        }

        return this.customerAuthService.logout(
            customer.sub,
            accessToken,
            refreshToken,
        );
    }

    @Post('password-reset/initiate')
    @Public()
    @ResponseMessage(
        `Password reset initiated. Please check your email for the reset token. It will expire in ${PASSWORD_RESET_TOKEN_TTL_SECONDS / 60} minutes.`,
    )
    initiatePasswordReset(@Body() data: InitiatePasswordResetDto) {
        return this.customerAuthService.initiatePasswordReset(data);
    }

    @Post('password-reset/verify')
    @Public()
    @ResponseMessage(
        `Password reset verified. This password reset is available for ${PASSWORD_RESET_VERIFIED_TTL_SECONDS / 60} minute.`,
    )
    @HttpCode(HttpStatus.OK)
    verifyPasswordReset(@Body() data: VerifyPasswordResetTokenDto) {
        return this.customerAuthService.verifyPasswordReset(data);
    }

    @Post('password-reset/reset')
    @Public()
    @ResponseMessage(
        'Password reset successful. You can now login with your new password.',
    )
    resetPassword(@Body() data: ResetPasswordDTO) {
        return this.customerAuthService.resetPassword(data);
    }

    private extractBearerToken(authorization?: string): string | undefined {
        if (!authorization) {
            return undefined;
        }

        const [type, token] = authorization.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}
