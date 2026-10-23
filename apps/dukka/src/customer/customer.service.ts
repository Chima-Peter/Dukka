import {
    BadRequestException,
    ConflictException,
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
import {
    ServiceCountryStatus,
    MarketStatus,
    TokenType,
    type Customer,
} from '../../generated/prisma/client.js';
import { CustomerRepository } from './customer.repository.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import {
    ACCOUNT_DELETION_TOKEN_TTL_SECONDS,
    RedisKeys,
    REFRESH_TOKEN_TTL_SECONDS,
} from '../shared/index.js';
import { UpdateCustomerDTO } from './dto/update-customer.dto.js';
import { VerifyAccountDeletionDto } from './dto/verify_account_deletion.dto.js';
import {
    ALLOWED_AVATAR_CONTENT_TYPES,
    AVATAR_BUCKET,
    MAX_AVATAR_BYTES,
    RedisService,
    SupabaseService,
    type JwtPayload,
} from '@app/common';
import { MAIL_TEMPLATES, MailQueueService } from '@app/queues';
import { TokenRepository } from './token.repository.js';
import { ServiceCountryService } from '../service/service-country.service.js';

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly serviceCountryService: ServiceCountryService,
        private readonly supabaseService: SupabaseService,
        private readonly passwordHasher: PasswordHasher,
        private readonly redisService: RedisService,
        private readonly tokenRepository: TokenRepository,
        private readonly jwtService: JwtService,
        private readonly mailQueueService: MailQueueService,
    ) {}

    async create(data: CreateCustomerDto): Promise<Customer> {
        try {
            this.logger.log(`Creating customer ${data.email}`);
            const customer = await this.customerRepository.create(data);
            this.logger.log(`Customer created ${customer.email}`);
            return customer;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                this.logger.warn(`Conflict error: ${error.message}`);
                const target = error.meta?.target;
                const fields = Array.isArray(target) ? target : [target];
                throw new ConflictException('This email is already in use!');
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async findByEmail(email: string): Promise<Customer | null> {
        try {
            return await this.customerRepository.findByEmail(email);
        } catch {
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async findByID(id: string): Promise<Customer | null> {
        try {
            return await this.customerRepository.findByID(id);
        } catch {
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async getMe(customer_id: string): Promise<object> {
        try {
            this.logger.log(`Fetching profile for customer ${customer_id}`);

            const customer =
                await this.customerRepository.getCustomer(customer_id);
            if (!customer) {
                throw new NotFoundException('Customer not found');
            }

            let avatar_url: string | null = null;
            if (customer.avatar)
                avatar_url = this.supabaseService.getPublicURL(
                    customer.avatar,
                    AVATAR_BUCKET,
                );

            const {
                password: _,
                createdAt: __,
                updatedAt: ___,
                avatar: ____,
                ...data
            } = customer;

            return {
                ...data,
                profile_url: avatar_url,
            };
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

    async setActiveMarket(
        customerId: string,
        country_id: string,
    ): Promise<{ active_market_id: string }> {
        try {
            this.logger.log(
                `Setting active market ${country_id} for customer ${customerId}`,
            );

            const country =
                await this.serviceCountryService.findByIDOrThrow(country_id);
            if (country.status !== ServiceCountryStatus.OPEN) {
                throw new BadRequestException(
                    'Cannot set country as active country as it is currently not open!',
                );
            }
            if (
                country.market === null ||
                country.market.status !== MarketStatus.OPEN
            ) {
                throw new BadRequestException(
                    'Cannot set country as active country as its market is currently not open!',
                );
            }

            const { active_market_id } =
                await this.customerRepository.updateActiveMarketId(
                    customerId,
                    country.market.id,
                );
            if (active_market_id === null) {
                throw new InternalServerErrorException('Failed to set active market')
            }

            await this.persistActiveMarketToRedis(customerId, active_market_id);

            this.logger.log(
                `Active market ${active_market_id} set for customer ${customerId}`,
            );
            return { active_market_id };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException('Customer not found');
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                throw new NotFoundException('Market not found');
            }
            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async getActiveMarketId(customerId: string): Promise<string | null> {
        const cached = await this.redisService.get(
            RedisKeys.customerActiveMarket(customerId),
        );
        if (cached !== null) {
            return cached === '' ? null : cached;
        }

        const customer = await this.customerRepository.findByID(customerId);
        const marketId = customer?.active_market_id ?? null;
        await this.persistActiveMarketToRedis(customerId, marketId);
        return marketId;
    }

    async persistActiveMarketToRedis(
        customerId: string,
        marketId: string | null | undefined,
    ): Promise<void> {
        await this.redisService.set(
            RedisKeys.customerActiveMarket(customerId),
            marketId ?? '',
            REFRESH_TOKEN_TTL_SECONDS,
        );
    }

    async clearActiveMarketFromRedis(customerId: string): Promise<void> {
        await this.redisService.delete(
            RedisKeys.customerActiveMarket(customerId),
        );
    }

    async updatePassword(email: string, password: string): Promise<Customer> {
        try {
            const customer = await this.customerRepository.updatePassword(
                email,
                password,
            );
            return customer;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException('Customer not found');
            }
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async changePassword(
        customer_id: string,
        current_password: string,
        new_password: string,
    ) {
        try {
            this.logger.log('Changing user password');

            const customer = await this.findByID(customer_id);
            if (!customer) {
                throw new NotFoundException('Invalid user');
            }

            const isValid = await this.passwordHasher.verify(
                current_password,
                customer.password,
            );
            if (!isValid) {
                throw new UnauthorizedException('Invalid password');
            }

            this.logger.log('Saving new password');
            const hashedPassword = await this.passwordHasher.hash(new_password);
            await this.updatePassword(customer.email, hashedPassword);

            this.logger.log('User password updated');

            const {
                password: _,
                createdAt: __,
                updatedAt: ___,
                ...data
            } = customer;

            return data;
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

    async getAvatarUploadURL(customer_id: string, name: string) {
        this.logger.log('Generating supbase upload url for user');

        const data = await this.supabaseService.createSignedUploadUrl(
            customer_id,
            name,
            AVATAR_BUCKET,
        );

        return { data };
    }

    async updateCustomerDetails(customer_id: string, dto: UpdateCustomerDTO) {
        try {
            this.logger.log(`Updating customer details for ${customer_id}`);

            const existing = await this.customerRepository.findByID(customer_id);
            if (!existing) {
                throw new NotFoundException('Customer not found');
            }

            if (dto.avatar_path) {
                await this.assertValidAvatar(customer_id, dto.avatar_path);
            }

            const customer = await this.customerRepository.updateCustomer(
                customer_id,
                dto,
            );

            if (
                dto.avatar_path &&
                existing.avatar &&
                existing.avatar !== dto.avatar_path
            ) {
                try {
                    await this.supabaseService.deleteFile(
                        [existing.avatar],
                        AVATAR_BUCKET,
                    );
                } catch (error) {
                    this.logger.warn(
                        `Failed to delete previous avatar for customer ${customer_id}: ${error}`,
                    );
                }
            }

            this.logger.log(`Customer details updated for ${customer_id}`);

            const {
                password: _,
                createdAt: __,
                updatedAt: ___,
                ...data
            } = customer;
            return data;
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException('Customer not found');
            }
            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async initiateAccountDeletion(
        customer_id: string,
    ): Promise<{ token: string }> {
        try {
            this.logger.log(
                `Initiating account deletion for customer ${customer_id}`,
            );

            const customer = await this.findByID(customer_id);
            if (!customer) {
                throw new NotFoundException('Customer not found');
            }

            const token = String(randomInt(100000, 1000000));
            await this.redisService.set(
                RedisKeys.accountDeletionToken(customer.email),
                token,
                ACCOUNT_DELETION_TOKEN_TTL_SECONDS,
            );

            this.logger.log(
                `Account deletion token saved for customer ${customer.email}`,
            );

            await this.mailQueueService.enqueueSend({
                to: customer.email,
                subject: 'Confirm account deletion',
                template: MAIL_TEMPLATES.CUSTOMER_ACCOUNT_DELETION,
                context: {
                    name: customer.name,
                    email: customer.email,
                    token,
                    expiresInSeconds: ACCOUNT_DELETION_TOKEN_TTL_SECONDS,
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

    async verifyAccountDeletion(
        customer_id: string,
        data: VerifyAccountDeletionDto,
    ): Promise<object> {
        try {
            this.logger.log(
                `Verifying account deletion for customer ${customer_id}`,
            );

            const customer = await this.findByID(customer_id);
            if (!customer) {
                throw new NotFoundException('Customer not found');
            }

            const key = RedisKeys.accountDeletionToken(customer.email);
            const storedToken = await this.redisService.get(key);

            if (!storedToken) {
                this.logger.warn(
                    `No account deletion token found for ${customer.email}`,
                );
                throw new UnauthorizedException(
                    'Invalid or expired deletion token',
                );
            }

            const stored = Buffer.from(storedToken);
            const provided = Buffer.from(data.token);
            const isValid =
                stored.length === provided.length &&
                timingSafeEqual(stored, provided);

            if (!isValid) {
                this.logger.warn(
                    `Invalid account deletion token for ${customer.email}`,
                );
                throw new UnauthorizedException(
                    'Invalid or expired deletion token',
                );
            }

            const activeTokens =
                await this.tokenRepository.findAllByCustomerId(customer_id);
            await Promise.all(
                activeTokens
                    .filter((token) => token.type === TokenType.ACCESS)
                    .map((token) => this.blacklistAccessToken(token.token)),
            );
            await this.tokenRepository.deleteAllByCustomerId(customer_id);
            await this.clearActiveMarketFromRedis(customer_id);

            await this.delete(customer_id);
            await this.redisService.delete(key);

            this.logger.log(`Account deleted for customer ${customer.email}`);

            await this.mailQueueService.enqueueSend({
                to: customer.email,
                subject: 'Your account has been deleted',
                template: MAIL_TEMPLATES.CUSTOMER_ACCOUNT_DELETED,
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

    async delete(customer_id: string): Promise<void> {
        try {
            this.logger.log(`Deleting customer ${customer_id}`);

            const customer = await this.findByID(customer_id);
            if (!customer) {
                throw new NotFoundException('Customer not found');
            }

            if (customer.avatar) {
                try {
                    await this.supabaseService.deleteFile(
                        [customer.avatar],
                        AVATAR_BUCKET,
                    );
                } catch (error) {
                    this.logger.warn(
                        `Failed to delete avatar for customer ${customer_id}: ${error}`,
                    );
                }
            }

            await this.customerRepository.delete(customer_id);
            this.logger.log(`Customer deleted ${customer_id}`);
        } catch (error) {
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException('Customer not found');
            }
            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    private async blacklistAccessToken(token: string): Promise<void> {
        const payload = this.jwtService.decode<JwtPayload>(token);
        if (!payload?.exp) {
            return;
        }

        const remainingTtlSeconds = Math.max(
            0,
            payload.exp - Math.floor(Date.now() / 1000),
        );
        if (remainingTtlSeconds <= 0) {
            return;
        }

        await this.redisService.set(
            RedisKeys.blacklistedToken(token),
            '1',
            remainingTtlSeconds,
        );
    }

    private async assertValidAvatar(
        customer_id: string,
        avatar_path: string,
    ): Promise<void> {
        if (!avatar_path.startsWith(`${customer_id}/`)) {
            this.logger.warn(
                `Avatar path does not belong to customer ${customer_id}`,
            );
            throw new BadRequestException('Invalid avatar filepath');
        }

        const objectInfo = await this.supabaseService.getObjectInfo(
            avatar_path,
            AVATAR_BUCKET,
        );
        if (!objectInfo) {
            this.logger.warn(`Avatar not found at ${avatar_path}`);
            throw new BadRequestException('Invalid avatar filepath');
        }

        if (objectInfo.size <= 0) {
            this.logger.warn(`Avatar at ${avatar_path} is empty`);
            await this.supabaseService.deleteFile([avatar_path], AVATAR_BUCKET);
            throw new BadRequestException('Avatar file is empty');
        }

        if (objectInfo.size > MAX_AVATAR_BYTES) {
            this.logger.warn(
                `Avatar at ${avatar_path} exceeds size limit (${objectInfo.size} bytes)`,
            );
            await this.supabaseService.deleteFile([avatar_path], AVATAR_BUCKET);
            throw new BadRequestException(
                `Avatar must be ${MAX_AVATAR_BYTES / (1024 * 1024)}MB or smaller`,
            );
        }

        const contentType = objectInfo.contentType.toLowerCase();
        if (!ALLOWED_AVATAR_CONTENT_TYPES.has(contentType)) {
            this.logger.warn(
                `Avatar at ${avatar_path} has invalid content type ${objectInfo.contentType}`,
            );
            await this.supabaseService.deleteFile([avatar_path], AVATAR_BUCKET);
            throw new BadRequestException(
                'Avatar must be a JPEG, PNG, WebP, or GIF image',
            );
        }
    }
}
