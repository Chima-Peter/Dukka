import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { MAIL_TEMPLATES, MailQueueService } from '@app/queues';
import type { CreateMarketDto } from './dto/create-market.dto.js';
import type { UpdateMarketDto } from './dto/update-market.dto.js';
import type { ValidateMarketsDto } from './dto/validate-markets.dto.js';
import {
    MarketsRepository,
    type MarketWithCurrency,
} from './markets.repository.js';

@Injectable()
export class MarketsService {
    private readonly logger = new Logger(MarketsService.name);

    constructor(
        private readonly marketsRepository: MarketsRepository,
        private readonly mailQueueService: MailQueueService,
    ) {}

    async create(data: CreateMarketDto): Promise<MarketWithCurrency> {
        try {
            this.logger.log(`Creating market ${data.code}`);
            const market = await this.marketsRepository.create(data);
            this.logger.log(`Market created ${market.id}`);
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(market_ids: string[]): Promise<MarketWithCurrency[]> {
        try {
            this.logger.log('Fetching markets');
            return await this.marketsRepository.findAll(market_ids);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        market_ids: string[],
    ): Promise<MarketWithCurrency> {
        try {
            this.logger.log(`Fetching market ${id}`);
            const market = await this.marketsRepository.findById(
                id,
                market_ids,
            );
            if (!market) {
                throw new NotFoundException('Market not found');
            }
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async validateIds(data: ValidateMarketsDto): Promise<{
        valid: boolean;
        invalid_ids: string[];
        inactive_ids: string[];
    }> {
        try {
            this.logger.log(
                `Validating ${data.market_ids.length} market id(s)`,
            );
            const existing = await this.marketsRepository.findExistingByIds(
                data.market_ids,
            );
            const existingById = new Map(
                existing.map((market) => [market.id, market]),
            );
            const invalidIds = data.market_ids.filter(
                (id) => !existingById.has(id),
            );
            const inactiveIds = data.market_ids.filter(
                (id) => existingById.get(id)?.is_active === false,
            );
            return {
                valid: invalidIds.length === 0 && inactiveIds.length === 0,
                invalid_ids: invalidIds,
                inactive_ids: inactiveIds,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateMarketDto,
    ): Promise<MarketWithCurrency> {
        try {
            this.logger.log(`Updating market ${id}`);
            const existing = await this.requireMarket(id);
            if (!existing.is_active) {
                throw new BadRequestException('Market is inactive');
            }
            const market = await this.marketsRepository.update(id, data);
            this.logger.log(`Market updated ${id}`);

            await this.notifyMarketStaff(market, 'A market you access was updated');
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async activate(id: string): Promise<MarketWithCurrency> {
        return this.setActive(id, true);
    }

    async deactivate(id: string): Promise<MarketWithCurrency> {
        return this.setActive(id, false);
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting market ${id}`);
            const existing = await this.requireMarket(id);
            if (existing.is_active) {
                throw new BadRequestException(
                    'Deactivate the market before deleting it',
                );
            }
            const contacts =
                await this.marketsRepository.findStaffContactsByMarketId(id);
            const market = await this.marketsRepository.delete(id);
            this.logger.log(`Market deleted ${id}`);

            await this.mailQueueService.enqueueSendMany(
                contacts.map((contact) => ({
                    to: contact.email,
                    subject: 'A market you access was deleted',
                    template: MAIL_TEMPLATES.MARKET_DELETED,
                    context: {
                        name: contact.name,
                        email: contact.email,
                        marketId: market.id,
                        marketName: market.name,
                        marketCode: market.code,
                    },
                })),
            );

            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async setActive(
        id: string,
        is_active: boolean,
    ): Promise<MarketWithCurrency> {
        try {
            const action = is_active ? 'Activating' : 'Deactivating';
            this.logger.log(`${action} market ${id}`);
            const existing = await this.requireMarket(id);
            if (existing.is_active === is_active) {
                throw new BadRequestException(
                    is_active
                        ? 'Market is already active'
                        : 'Market is already inactive',
                );
            }
            const market = await this.marketsRepository.setActive(
                id,
                is_active,
            );
            this.logger.log(
                `Market ${is_active ? 'activated' : 'deactivated'} ${id}`,
            );
            await this.notifyMarketStaff(
                market,
                is_active
                    ? 'A market you access was activated'
                    : 'A market you access was deactivated',
            );
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async requireMarket(
        id: string,
    ): Promise<{ id: string; is_active: boolean }> {
        const [market] = await this.marketsRepository.findExistingByIds([id]);
        if (!market) {
            throw new NotFoundException('Market not found');
        }
        return market;
    }

    private async notifyMarketStaff(
        market: MarketWithCurrency,
        subject: string,
    ): Promise<void> {
        const contacts =
            await this.marketsRepository.findStaffContactsByMarketId(
                market.id,
            );

        await this.mailQueueService.enqueueSendMany(
            contacts.map((contact) => ({
                to: contact.email,
                subject,
                template: MAIL_TEMPLATES.MARKET_UPDATED,
                context: {
                    name: contact.name,
                    email: contact.email,
                    marketId: market.id,
                    marketName: market.name,
                    marketCode: market.code,
                    isActive: market.is_active,
                },
            })),
        );
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                const target = Array.isArray(error.meta?.target)
                    ? error.meta.target.join(',')
                    : String(error.meta?.target ?? '');
                if (target.includes('currency_id')) {
                    throw new ConflictException(
                        'This currency is already assigned to another market',
                    );
                }
                throw new ConflictException(
                    'A market with this code already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on market: ${error.message}`,
                );
                const field = String(error.meta?.field_name ?? '');
                if (field.includes('currency')) {
                    throw new NotFoundException('Currency not found');
                }
                throw new ConflictException(
                    'Market cannot be deleted while it is still assigned to staff',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Market not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
