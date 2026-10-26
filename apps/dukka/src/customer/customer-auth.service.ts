import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { CustomerService } from './customer.service.js';
import type { LoginDto } from './dto/login.dto.js';
import {
    PasswordHasher,
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
    PASSWORD_RESET_VERIFIED_TTL_SECONDS,
    RedisKeys,
} from '../shared/index.js';
import type { AuthTokens, LoginData, PublicCustomer } from './types/index.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import {
    RedisService,
    type CustomerJwtPayload,
    type JwtPayload,
    TokenType,
} from '@app/common';
import { MAIL_TEMPLATES, MailQueueService } from '@app/queues';
import { InitiatePasswordResetDto } from './dto/initiate_password_reset.dto.js';
import { VerifyPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import { ResetPasswordDTO } from './dto/reset_password.dto.js';
import { ChangePasswordDto } from './dto/change_password.dto.js';
import {
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
} from '../shared/redis.constants.js';
import { CartRepository } from '../cart/cart.repository.js';
import { TokenRepository } from './token.repository.js';

@Injectable()
export class CustomerAuthService {
    private readonly logger = new Logger(CustomerAuthService.name);
    constructor(
        private readonly customerService: CustomerService,
        private readonly jwtService: JwtService,
        private readonly passwordHasher: PasswordHasher,
        private readonly redisService: RedisService,
        private readonly tokenRepository: TokenRepository,
        private readonly mailQueueService: MailQueueService,
        private readonly cartRepository: CartRepository,
    ) {}

    async register(data: CreateCustomerDto): Promise<PublicCustomer> {
        this.logger.log(`Registering customer ${data.email}`);
        const password = await this.passwordHasher.hash(data.password);
        const customer = await this.customerService.create({
            ...data,
            password,
        });

        this.logger.log(`Customer registered ${customer.email}`);
        const {
            password: _,
            createdAt: __,
            updatedAt: ___,
            ...publicCustomer
        } = customer;

        await this.mailQueueService.enqueueSend({
            to: customer.email,
            subject: 'Welcome to Dukka',
            template: MAIL_TEMPLATES.CUSTOMER_WELCOME,
            context: {
                name: customer.name,
                email: customer.email,
            },
        });

        return publicCustomer;
    }

    async login(data: LoginDto): Promise<LoginData> {
        try {
            this.logger.log(`Logging in customer ${data.email}`);
            const customer = await this.customerService.findByEmail(data.email);
            if (!customer) {
                this.logger.warn(`Customer ${data.email} not found`);
                throw new UnauthorizedException('Invalid email or password');
            }

            this.logger.log(`Customer ${data.email} found`);
            const isValid = await this.passwordHasher.verify(
                data.password,
                customer.password,
            );
            if (!customer || !isValid) {
                this.logger.warn(
                    `Invalid email or password for customer ${data.email}`,
                );
                throw new UnauthorizedException('Invalid email or password');
            }

            const {
                password: _,
                createdAt: __,
                updatedAt: ___,
                ...publicCustomer
            } = customer;
            this.logger.log(`Customer ${data.email} password verified`);

            const cart_id =
                await this.cartRepository.findOrCreateCartIdForCustomer(
                    customer.id,
                );
            const tokens = await this.issueTokenPair({
                id: customer.id,
                email: customer.email,
                name: customer.name,
                cart_id,
                active_market_id: customer.active_market_id,
            });

            return { ...tokens, customer: publicCustomer };
        } catch (error) {
            this.logger.error(`Internal server error: ${error}`);
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                this.logger.warn(`Customer not found: ${error.message}`);
                throw new NotFoundException('Customer not found');
            }

            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async refresh(refreshToken: string): Promise<AuthTokens> {
        try {
            this.logger.log('Refreshing customer tokens');

            const payload =
                await this.jwtService.verifyAsync<CustomerJwtPayload>(
                    refreshToken,
                    { algorithms: ['RS256'] },
                );

            if (
                payload.type !== 'customer' ||
                payload.tokenUse !== 'refresh'
            ) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const storedToken =
                await this.tokenRepository.findRefreshToken(refreshToken);
            if (!storedToken || storedToken.customerId !== payload.sub) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const deletedCount = await this.tokenRepository.deleteRefreshToken(
                payload.sub,
                refreshToken,
            );
            if (deletedCount === 0) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const active_market_id =
                await this.customerService.getActiveMarketId(payload.sub);

            return this.issueTokenPair({
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                cart_id: payload.cart_id,
                active_market_id,
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
        customerId: string,
        accessToken: string,
        refreshToken: string,
    ): Promise<object> {
        try {
            this.logger.log(`Logging out customer ${customerId}`);

            const payload =
                await this.jwtService.verifyAsync<CustomerJwtPayload>(
                    refreshToken,
                    { algorithms: ['RS256'] },
                );

            if (
                payload.type !== 'customer' ||
                payload.tokenUse !== 'refresh' ||
                payload.sub !== customerId
            ) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            const deletedRefresh =
                await this.tokenRepository.deleteRefreshToken(
                    customerId,
                    refreshToken,
                );
            if (deletedRefresh === 0) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            await this.tokenRepository.deleteByToken(customerId, accessToken);
            await this.blacklistAccessToken(accessToken);
            await this.customerService.clearActiveMarketFromRedis(customerId);

            this.logger.log(`Tokens revoked for customer ${customerId}`);
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
        data: InitiatePasswordResetDto,
    ): Promise<{ token: string }> {
        try {
            this.logger.log(
                `Initiating password reset for customer ${data.email}`,
            );

            const customer = await this.customerService.findByEmail(data.email);
            if (!customer) {
                this.logger.warn(`Customer ${data.email} not found`);
                throw new NotFoundException('Customer not found');
            }

            const token = String(randomInt(100000, 1000000));
            await this.redisService.set(
                RedisKeys.passwordResetToken(data.email),
                token,
                PASSWORD_RESET_TOKEN_TTL_SECONDS,
            );

            this.logger.log(
                `Password reset token saved for customer ${data.email}`,
            );

            await this.mailQueueService.enqueueSend({
                to: data.email,
                subject: 'Reset your password',
                template: MAIL_TEMPLATES.CUSTOMER_PASSWORD_RESET,
                context: {
                    name: customer.name,
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
        data: VerifyPasswordResetTokenDto,
    ): Promise<{ email: string }> {
        try {
            this.logger.log(`Verifying password reset token for ${data.email}`);

            const key = RedisKeys.passwordResetToken(data.email);
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

            if (!storedToken || !isValid) {
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
                RedisKeys.passwordResetVerified(data.email),
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

    async resetPassword(data: ResetPasswordDTO): Promise<object> {
        try {
            this.logger.log(`Resetting password for customer ${data.email}`);

            const email = data.email;
            const redis_key = RedisKeys.passwordResetVerified(email);
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
            const customer = await this.customerService.updatePassword(
                email,
                password,
            );

            await this.revokeAllTokens(customer.id);
            await this.redisService.delete(redis_key);

            this.logger.log(`Password reset for ${email}`);

            await this.mailQueueService.enqueueSend({
                to: email,
                subject: 'Your password was changed',
                template: MAIL_TEMPLATES.CUSTOMER_PASSWORD_CHANGED,
                context: {
                    name: customer.name,
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
        customerId: string,
        data: ChangePasswordDto,
    ): Promise<object> {
        try {
            this.logger.log(`Changing password for customer ${customerId}`);

            const customer = await this.customerService.changePassword(
                customerId,
                data.currentPassword,
                data.newPassword,
            );

            await this.revokeAllTokens(customerId);

            this.logger.log(`Password changed for customer ${customerId}`);

            await this.mailQueueService.enqueueSend({
                to: customer.email,
                subject: 'Your password was changed',
                template: MAIL_TEMPLATES.CUSTOMER_PASSWORD_CHANGED,
                context: {
                    name: customer.name,
                    email: customer.email,
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

    private async revokeAllTokens(customerId: string): Promise<void> {
        const activeTokens =
            await this.tokenRepository.findAllByCustomerId(customerId);
        await Promise.all(
            activeTokens
                .filter((token) => token.type === TokenType.ACCESS)
                .map((token) => this.blacklistAccessToken(token.token)),
        );
        await this.tokenRepository.deleteAllByCustomerId(customerId);
        await this.customerService.clearActiveMarketFromRedis(customerId);
    }

    private async issueTokenPair(customer: {
        id: string;
        email: string;
        name: string;
        cart_id: string;
        active_market_id?: string | null;
    }): Promise<AuthTokens> {
        const basePayload = {
            sub: customer.id,
            email: customer.email,
            type: 'customer' as const,
            name: customer.name,
            cart_id: customer.cart_id,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { ...basePayload, tokenUse: 'access' },
                { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
            ),
            this.jwtService.signAsync(
                { ...basePayload, tokenUse: 'refresh' },
                { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
            ),
        ]);

        await this.tokenRepository.createMany([
            {
                token: accessToken,
                type: TokenType.ACCESS,
                customerId: customer.id,
            },
            {
                token: refreshToken,
                type: TokenType.REFRESH,
                customerId: customer.id,
            },
        ]);

        await this.customerService.persistActiveMarketToRedis(
            customer.id,
            customer.active_market_id,
        );

        this.logger.log(`Token pair issued for customer ${customer.email}`);

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
        const payload = this.jwtService.decode<JwtPayload>(token);
        if (!payload?.exp) {
            return 0;
        }

        return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    }
}
