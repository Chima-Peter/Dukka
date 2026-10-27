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
    TokenType,
} from '@app/common';
import { MAIL_TEMPLATES, MailQueueService } from '@app/queues';
import {
    PasswordHasher,
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
    PASSWORD_RESET_VERIFIED_TTL_SECONDS,
    RedisKeys,
} from '../shared/index.js';
import {
    STAFF_ACCESS_TOKEN_TTL_SECONDS,
    STAFF_REFRESH_TOKEN_TTL_SECONDS,
} from '../shared/redis.constants.js';
import type { ChangeStaffPasswordDto } from './dto/change_password.dto.js';
import type { InitiateStaffPasswordResetDto } from './dto/initiate_password_reset.dto.js';
import type { StaffLoginDto } from './dto/login.dto.js';
import type { ResetStaffPasswordDto } from './dto/reset_password.dto.js';
import type { VerifyStaffPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { StaffService } from './staff.service.js';
import { StaffTokenRepository } from './token.repository.js';
import type { AuthTokens, StaffLoginData } from './types/index.js';

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
        private readonly mailQueueService: MailQueueService,
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
            const tokens = await this.issueTokenPair({
                sub: staff.id,
                email: staff.email,
                type: 'staff',
                name: staff.name,
                role_id: staff.role_id,
                role_name: staff.role?.name ?? null,
                hierarchy: staff.role?.hierarchy ?? null,
                market_ids: staff.staff_markets.map((sm) => sm.market_id),
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

            return { ...tokens, staff: publicStaff };
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

    async refresh(refreshToken: string): Promise<AuthTokens> {
        try {
            this.logger.log('Refreshing staff tokens');

            const payload =
                await this.staffJwtService.verifyAsync<StaffJwtPayload>(
                    refreshToken,
                    { algorithms: ['RS256'] },
                );

            if (payload.type !== 'staff' || payload.tokenUse !== 'refresh') {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const storedToken =
                await this.tokenRepository.findRefreshToken(refreshToken);
            if (!storedToken || storedToken.staffId !== payload.sub) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const staff = await this.staffService.findByEmail(payload.email);
            if (!staff) {
                throw new UnauthorizedException('Invalid or expired token');
            }
            if (!staff.is_active) {
                this.logger.warn(`Staff ${payload.email} is inactive`);
                throw new UnauthorizedException('Account is inactive');
            }

            const deletedCount = await this.tokenRepository.deleteRefreshToken(
                payload.sub,
                refreshToken,
            );
            if (deletedCount === 0) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            return this.issueTokenPair({
                sub: payload.sub,
                email: payload.email,
                type: 'staff',
                name: payload.name,
                role_id: payload.role_id,
                role_name: payload.role_name,
                hierarchy: payload.hierarchy,
                market_ids: payload.market_ids,
            });
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    async logout(
        staffId: string,
        accessToken: string,
        refreshToken: string,
    ): Promise<object> {
        try {
            this.logger.log(`Logging out staff ${staffId}`);

            const payload =
                await this.staffJwtService.verifyAsync<StaffJwtPayload>(
                    refreshToken,
                    { algorithms: ['RS256'] },
                );

            if (
                payload.type !== 'staff' ||
                payload.tokenUse !== 'refresh' ||
                payload.sub !== staffId
            ) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const deletedRefresh =
                await this.tokenRepository.deleteRefreshToken(
                    staffId,
                    refreshToken,
                );
            if (deletedRefresh === 0) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            await this.tokenRepository.deleteByToken(staffId, accessToken);
            await this.blacklistAccessToken(accessToken);

            this.logger.log(`Tokens revoked for staff ${staffId}`);
            return { data: null };
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new UnauthorizedException('Invalid or expired token');
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
            if (!staff.is_active) {
                this.logger.warn(`Staff ${data.email} is inactive`);
                throw new UnauthorizedException('Account is inactive');
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

            await this.mailQueueService.enqueueSend({
                to: data.email,
                subject: 'Reset your staff password',
                template: MAIL_TEMPLATES.STAFF_PASSWORD_RESET,
                context: {
                    name: staff.name,
                    email: data.email,
                    token,
                    expiresInSeconds: PASSWORD_RESET_TOKEN_TTL_SECONDS,
                },
            });

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

            const existing = await this.staffService.findByEmail(email);
            if (!existing) {
                this.logger.warn(`Staff ${email} not found`);
                throw new NotFoundException('Staff not found');
            }
            if (!existing.is_active) {
                this.logger.warn(`Staff ${email} is inactive`);
                throw new UnauthorizedException('Account is inactive');
            }

            const password = await this.passwordHasher.hash(data.password);
            const staff = await this.staffService.updatePassword(
                email,
                password,
            );

            await this.revokeAllTokens(staff.id);
            await this.redisService.delete(redis_key);

            this.logger.log(`Password reset for ${email}`);

            await this.mailQueueService.enqueueSend({
                to: email,
                subject: 'Your staff password was changed',
                template: MAIL_TEMPLATES.STAFF_PASSWORD_CHANGED,
                context: {
                    name: staff.name,
                    email,
                },
            });

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

            const staff = await this.staffService.findOne(staffId);

            await this.staffService.changePassword(
                staffId,
                data.currentPassword,
                data.newPassword,
            );

            await this.revokeAllTokens(staffId);

            this.logger.log(`Password changed for staff ${staffId}`);

            await this.mailQueueService.enqueueSend({
                to: staff.email,
                subject: 'Your staff password was changed',
                template: MAIL_TEMPLATES.STAFF_PASSWORD_CHANGED,
                context: {
                    name: staff.name,
                    email: staff.email,
                },
            });

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

    private async revokeAllTokens(staffId: string): Promise<void> {
        const activeTokens =
            await this.tokenRepository.findAllByStaffId(staffId);
        await Promise.all(
            activeTokens
                .filter((token) => token.type === TokenType.ACCESS)
                .map((token) => this.blacklistAccessToken(token.token)),
        );
        await this.tokenRepository.deleteAllByStaffId(staffId);
    }

    private async issueTokenPair(
        claims: Omit<StaffJwtPayload, 'iat' | 'exp' | 'tokenUse'>,
    ): Promise<AuthTokens> {
        const [accessToken, refreshToken] = await Promise.all([
            this.staffJwtService.signAsync(
                { ...claims, tokenUse: 'access' },
                { expiresIn: STAFF_ACCESS_TOKEN_TTL_SECONDS },
            ),
            this.staffJwtService.signAsync(
                { ...claims, tokenUse: 'refresh' },
                { expiresIn: STAFF_REFRESH_TOKEN_TTL_SECONDS },
            ),
        ]);

        await this.tokenRepository.createMany([
            {
                token: accessToken,
                type: TokenType.ACCESS,
                staffId: claims.sub,
            },
            {
                token: refreshToken,
                type: TokenType.REFRESH,
                staffId: claims.sub,
            },
        ]);

        this.logger.log(`Token pair issued for staff ${claims.email}`);

        return { accessToken, refreshToken };
    }

    private async blacklistAccessToken(token: string): Promise<void> {
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
