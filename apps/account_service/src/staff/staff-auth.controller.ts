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
    CurrentStaff,
    Public,
    ResponseMessage,
    type StaffJwtPayload,
} from '@app/common';
import {
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
    PASSWORD_RESET_VERIFIED_TTL_SECONDS,
} from '../shared/redis.constants.js';
import { ChangeStaffPasswordDto } from './dto/change_password.dto.js';
import { InitiateStaffPasswordResetDto } from './dto/initiate_password_reset.dto.js';
import { StaffLoginDto } from './dto/login.dto.js';
import { ResetStaffPasswordDto } from './dto/reset_password.dto.js';
import { VerifyStaffPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import { StaffAuthService } from './staff-auth.service.js';

@Controller('authentication/staff')
export class StaffAuthController {
    constructor(private readonly staffAuthService: StaffAuthService) {}

    @Post('login')
    @Public()
    @ResponseMessage('Login successful')
    login(@Body() data: StaffLoginDto) {
        return this.staffAuthService.login(data);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Logout successful')
    logout(
        @CurrentStaff() staff: StaffJwtPayload,
        @Headers('authorization') authorization?: string,
    ) {
        const accessToken = this.extractBearerToken(authorization);
        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }

        return this.staffAuthService.logout(staff.sub, accessToken);
    }

    @Post('password-reset/initiate')
    @Public()
    @ResponseMessage(
        `Password reset initiated. Please check your email for the reset token. It will expire in ${PASSWORD_RESET_TOKEN_TTL_SECONDS / 60} minutes.`,
    )
    initiatePasswordReset(@Body() data: InitiateStaffPasswordResetDto) {
        return this.staffAuthService.initiatePasswordReset(data);
    }

    @Post('password-reset/verify')
    @Public()
    @ResponseMessage(
        `Password reset verified. This password reset is available for ${PASSWORD_RESET_VERIFIED_TTL_SECONDS / 60} minute.`,
    )
    @HttpCode(HttpStatus.OK)
    verifyPasswordReset(@Body() data: VerifyStaffPasswordResetTokenDto) {
        return this.staffAuthService.verifyPasswordReset(data);
    }

    @Post('password-reset/reset')
    @Public()
    @ResponseMessage(
        'Password reset successful. You can now login with your new password.',
    )
    resetPassword(@Body() data: ResetStaffPasswordDto) {
        return this.staffAuthService.resetPassword(data);
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage(
        'Password changed successfully. Please login with your new password.',
    )
    changePassword(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: ChangeStaffPasswordDto,
    ) {
        return this.staffAuthService.changePassword(staff.sub, data);
    }

    private extractBearerToken(authorization?: string): string | undefined {
        if (!authorization) {
            return undefined;
        }

        const [type, token] = authorization.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}
