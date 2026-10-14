import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { CustomerService } from '../customer/customer.service.js';
import type { LoginDto } from './dto/login.dto.js';
import {
  PasswordHasher,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_VERIFIED_TTL_SECONDS,
  RedisKeys,
} from '../shared/index.js';
import type { LoginData, PublicCustomer } from './types/index.js';
import { CreateCustomerDto } from '../customer/dto/create-customer.dto.js';
import { RedisService, type JwtPayload } from '@app/common';
import { InitiatePasswordResetDto } from './dto/initiate_password_reset.dto.js';
import { VerifyPasswordResetTokenDto } from './dto/verify_password_reset_token.dto.js';
import { ResetPasswordDTO } from './dto/reset_password.dto.js';
import { ChangePasswordDto } from './dto/change_password.dto.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../shared/redis.constants.js';
import { TokenType } from '../../generated/prisma/client.js';
import { TokenRepository } from './token.repository.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly customerService: CustomerService,
    private readonly jwtService: JwtService,
    private readonly passwordHasher: PasswordHasher,
    private readonly redisService: RedisService,
    private readonly tokenRepository: TokenRepository,
  ) {}

  async register(data: CreateCustomerDto): Promise<PublicCustomer> {
    this.logger.log(`Registering customer ${data.email}`);
    const password = await this.passwordHasher.hash(data.password);
    const customer = await this.customerService.create({
      ...data,
      password,
    });

    this.logger.log(`Customer registered ${customer.email}`);
    const { password: _, ...publicCustomer } = customer;

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
        this.logger.warn(`Invalid email or password for customer ${data.email}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      const { password: _, ...publicCustomer } = customer;
      this.logger.log(`Customer ${data.email} password verified`);

      const accessToken = await this.jwtService.signAsync(
        {
          sub: customer.id,
          email: customer.email,
          type: 'customer',
          name: customer.name,
        },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      );

      this.logger.log(`Access token generated for customer ${data.email}`);

      await this.tokenRepository.create({
        token: accessToken,
        type: TokenType.ACCESS,
        customerId: customer.id,
      });

      return { accessToken, customer: publicCustomer };
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

  async logout(customerId: string, accessToken: string): Promise<object> {
    try {
      this.logger.log(`Logging out customer ${customerId}`);

      const deletedCount = await this.tokenRepository.deleteByToken(
        customerId,
        accessToken,
      );
      if (deletedCount === 0) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      await this.blacklistToken(accessToken);

      this.logger.log(`Access token blacklisted for customer ${customerId}`);
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

  async initiate_password_reset(
    data: InitiatePasswordResetDto,
  ): Promise<{ token: string }> {
    try {
      this.logger.log(`Initiating password reset for customer ${data.email}`);

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

      this.logger.log(`Password reset token saved for customer ${data.email}`);
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

  async verify_password_reset(
    data: VerifyPasswordResetTokenDto,
  ): Promise<{ email: string }> {
    try {
      this.logger.log(`Verifying password reset token for ${data.email}`);

      const key = RedisKeys.passwordResetToken(data.email);
      const storedToken = await this.redisService.get(key);

      if (!storedToken) {
        this.logger.warn(`No password reset token found for ${data.email}`);
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const stored = Buffer.from(storedToken);
      const provided = Buffer.from(data.token);
      const isValid =
        stored.length === provided.length &&
        timingSafeEqual(stored, provided);

      if (!storedToken || !isValid) {
        this.logger.warn(`Invalid password reset token for ${data.email}`);
        throw new UnauthorizedException('Invalid or expired reset token');
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

  async reset_password(data: ResetPasswordDTO): Promise<object> {
    try {
      this.logger.log(`Resetting password for customer ${data.email}`);

      const email = data.email;
      const redis_key = RedisKeys.passwordResetVerified(email);
      const stored = await this.redisService.get(redis_key);
      if (!stored) {
        this.logger.warn(`No password reset verified found for ${email}`);
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const password = await this.passwordHasher.hash(data.password);
      const customer = await this.customerService.updatePassword(email, password);

      const activeTokens = await this.tokenRepository.deleteAllByCustomerId(
        customer.id,
      );

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

  async change_password(
    customerId: string,
    data: ChangePasswordDto,
  ): Promise<object> {
    try {
      this.logger.log(`Changing password for customer ${customerId}`);

      await this.customerService.changePassword(
        customerId,
        data.currentPassword,
        data.newPassword,
      );

      const activeTokens = await this.tokenRepository.deleteAllByCustomerId(
        customerId,
      );

      await Promise.all(
        activeTokens.map((token) => this.blacklistToken(token.token)),
      );

      this.logger.log(`Password changed for customer ${customerId}`);

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
    const payload = this.jwtService.decode<JwtPayload>(token);
    if (!payload?.exp) {
      return 0;
    }

    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  }
}
