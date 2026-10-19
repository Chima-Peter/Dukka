import {
    HttpException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { randomInt, timingSafeEqual } from 'node:crypto';
import {
    RedisService,
    STAFF_JWT_SERVICE,
    type JwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { TokenType } from '../../generated/prisma/client.js';
import {
    PasswordHasher,
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
    PASSWORD_RESET_VERIFIED_TTL_SECONDS,
    RedisKeys,
} from '../shared/index.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../shared/redis.constants.js';
import type { ChangeStaffPasswordDto } from './dto/change_password.dto.js';
import type { InitiateStaffPasswordResetDto } from './dto/initiate_password_reset.dto.js';
import type { StaffLoginDto } from './dto/login.dto.js';
import type { ResetStaffPasswordDto } from './dto/reset_password.dto.js';
import type { VerifyStaffPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { StaffService } from './staff.service.js';
import { StaffTokenRepository } from './token.repository.js';
import type { StaffLoginData } from './types/index.js';

@Injectable()
export class StaffAuthService {
    private readonly logger = new Logger(StaffAuthService.name);

    constructor(
        private readonly staffService: StaffService,
        @Inject(STAFF_JWT_SERVICE)
        private readonly staffJwtService: JwtService,
        private readonly passwordHasher: PasswordHasher,
        private readonly redisService: RedisService,
        private readonly tokenRepository: StaffTokenRepository,
        private readonly permissionsService: PermissionsService,
    ) {}

    async login(data: StaffLoginDto): Promise<StaffLoginData> {
        try {
            this.logger.log(`Logging in staff ${data.email}`);
            const staff = await this.staffService.findByEmail(data.email);
            if (!staff) {
                this.logger.warn(`Staff ${data.email} not found`);
                throw new UnauthorizedException('Invalid email or password');
            }

            if (!staff.is_active) {
                this.logger.warn(`Staff ${data.email} is inactive`);
                throw new UnauthorizedException('Account is inactive');
            }

            const isValid = await this.passwordHasher.verify(
                data.password,
                staff.password,
            );
            if (!isValid) {
                this.logger.warn(
                    `Invalid email or password for staff ${data.email}`,
                );
                throw new UnauthorizedException('Invalid email or password');
            }

            this.logger.log(`Staff ${data.email} password verified`);

            const publicStaff = this.staffService.toPublicStaff(staff);
            const market_ids =
                staff.role?.role_markets.map((rm) => rm.market_id) ?? [];

            const payload: Omit<StaffJwtPayload, 'iat' | 'exp'> = {
                sub: staff.id,
                email: staff.email,
                type: 'staff',
                name: staff.name,
                role_id: staff.role_id,
                role_name: staff.role?.name ?? null,
                market_ids,
            };

            const accessToken = await this.staffJwtService.signAsync(payload, {
                expiresIn: ACCESS_TOKEN_TTL_SECONDS,
            });

            this.logger.log(`Access token generated for staff ${data.email}`);

            await this.tokenRepository.create({
                token: accessToken,
                type: TokenType.ACCESS,
                staffId: staff.id,
            });

            const permissions =
                this.permissionsService.extractPermissionNames(staff);
            await this.permissionsService.cacheStaffPermissions(
                staff.id,
                permissions,
            );

            this.logger.log(
                `Cached ${permissions.length} permission(s) for staff ${data.email}`,
            );

            return { accessToken, staff: publicStaff };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                this.logger.warn(`Staff not found: ${error.message}`);
                throw new NotFoundException('Staff not found');
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async logout(staffId: string, accessToken: string): Promise<object> {
        try {
            this.logger.log(`Logging out staff ${staffId}`);

            const deletedCount = await this.tokenRepository.deleteByToken(
                staffId,
                accessToken,
            );
            if (deletedCount === 0) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            await this.blacklistToken(accessToken);

            this.logger.log(`Access token blacklisted for staff ${staffId}`);
            return { data: null };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async initiatePasswordReset(
        data: InitiateStaffPasswordResetDto,
    ): Promise<{ token: string }> {
        try {
            this.logger.log(
                `Initiating password reset for staff ${data.email}`,
            );

            const staff = await this.staffService.findByEmail(data.email);
            if (!staff) {
                this.logger.warn(`Staff ${data.email} not found`);
                throw new NotFoundException('Staff not found');
            }

            const token = String(randomInt(100000, 1000000));
            await this.redisService.set(
                RedisKeys.staffPasswordResetToken(data.email),
                token,
                PASSWORD_RESET_TOKEN_TTL_SECONDS,
            );

            this.logger.log(
                `Password reset token saved for staff ${data.email}`,
            );
            return { token };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async verifyPasswordReset(
        data: VerifyStaffPasswordResetTokenDto,
    ): Promise<{ email: string }> {
        try {
            this.logger.log(`Verifying password reset token for ${data.email}`);

            const key = RedisKeys.staffPasswordResetToken(data.email);
            const storedToken = await this.redisService.get(key);

            if (!storedToken) {
                this.logger.warn(
                    `No password reset token found for ${data.email}`,
                );
                throw new UnauthorizedException(
                    'Invalid or expired reset token',
                );
            }

            const stored = Buffer.from(storedToken);
            const provided = Buffer.from(data.token);
            const isValid =
                stored.length === provided.length &&
                timingSafeEqual(stored, provided);

            if (!isValid) {
                this.logger.warn(
                    `Invalid password reset token for ${data.email}`,
                );
                throw new UnauthorizedException(
                    'Invalid or expired reset token',
                );
            }

            await this.redisService.delete(key);
            this.logger.log(`Password reset token verified for ${data.email}`);

            await this.redisService.set(
                RedisKeys.staffPasswordResetVerified(data.email),
                '1',
                PASSWORD_RESET_VERIFIED_TTL_SECONDS,
            );

            this.logger.log(`Password reset verified for ${data.email}`);

            return { email: data.email };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async resetPassword(data: ResetStaffPasswordDto): Promise<object> {
        try {
            this.logger.log(`Resetting password for staff ${data.email}`);

            const email = data.email;
            const redis_key = RedisKeys.staffPasswordResetVerified(email);
            const stored = await this.redisService.get(redis_key);
            if (!stored) {
                this.logger.warn(
                    `No password reset verified found for ${email}`,
                );
                throw new UnauthorizedException(
                    'Invalid or expired reset token',
                );
            }

            const password = await this.passwordHasher.hash(data.password);
            const staff = await this.staffService.updatePassword(
                email,
                password,
            );

            const activeTokens =
                await this.tokenRepository.deleteAllByStaffId(staff.id);

            await Promise.all(
                activeTokens.map((token) => this.blacklistToken(token.token)),
            );

            await this.redisService.delete(redis_key);

            this.logger.log(`Password reset for ${email}`);

            return { data: null };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async changePassword(
        staffId: string,
        data: ChangeStaffPasswordDto,
    ): Promise<object> {
        try {
            this.logger.log(`Changing password for staff ${staffId}`);

            await this.staffService.changePassword(
                staffId,
                data.currentPassword,
                data.newPassword,
            );

            const activeTokens =
                await this.tokenRepository.deleteAllByStaffId(staffId);

            await Promise.all(
                activeTokens.map((token) => this.blacklistToken(token.token)),
            );

            this.logger.log(`Password changed for staff ${staffId}`);

            return { data: null };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    private async blacklistToken(token: string): Promise<void> {
        const remainingTtlSeconds = this.getRemainingTtlSeconds(token);
        if (remainingTtlSeconds <= 0) {
            return;
        }

        await this.redisService.set(
            RedisKeys.blacklistedToken(token),
            '1',
            remainingTtlSeconds,
        );
    }

    private getRemainingTtlSeconds(token: string): number {
        const payload = this.staffJwtService.decode<JwtPayload>(token);
        if (!payload?.exp) {
            return 0;
        }

        return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    }
}
