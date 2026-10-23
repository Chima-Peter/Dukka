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
import { MarketStatus } from '../../generated/prisma/client.js';
import { prismaHintIncludes } from '../shared/prisma-relation-error.js';
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

    async findAll(
        market_ids: string[],
        status?: MarketStatus,
    ): Promise<MarketWithCurrency[]> {
        try {
            this.logger.log('Fetching markets');
            return await this.marketsRepository.findAll(market_ids, status);
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
                (id) => existingById.get(id)?.status !== MarketStatus.OPEN,
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
            if (existing.status === MarketStatus.CLOSED) {
                throw new BadRequestException('Cannot update a closed market');
            }
            const { notify_staff = false, ...updateData } = data;
            const market = await this.marketsRepository.update(id, updateData);
            this.logger.log(`Market updated ${id}`);

            if (notify_staff) {
                await this.notifyMarketStaff(
                    market,
                    'A market you access was updated',
                );
            }
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(id: string): Promise<MarketWithCurrency> {
        try {
            this.logger.log(`Opening market ${id}`);
            const existing = await this.requireMarket(id);
            if (existing.status === MarketStatus.OPEN) {
                throw new BadRequestException('Market is already open');
            }
            const market = await this.marketsRepository.setStatus(
                id,
                MarketStatus.OPEN,
            );
            this.logger.log(`Market opened ${id}`);
            await this.notifyMarketStaff(
                market,
                'A market you access was opened',
            );
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(id: string): Promise<MarketWithCurrency> {
        try {
            this.logger.log(`Closing market ${id}`);
            const existing = await this.requireMarket(id);
            if (existing.status === MarketStatus.CLOSED) {
                throw new BadRequestException('Market is already closed');
            }
            const market = await this.marketsRepository.setStatus(
                id,
                MarketStatus.CLOSED,
            );
            this.logger.log(`Market closed ${id}`);
            await this.notifyMarketStaff(
                market,
                'A market you access was closed',
            );
            return market;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting market ${id}`);
            const existing = await this.requireMarket(id);
            if (existing.status !== MarketStatus.CLOSED) {
                throw new BadRequestException(
                    'Close the market before deleting it',
                );
            }
            const countryCount =
                await this.marketsRepository.countServiceCountries(id);
            if (countryCount > 0) {
                throw new ConflictException(
                    'Market cannot be deleted while it still has service countries assigned',
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

    private async requireMarket(
        id: string,
    ): Promise<{ id: string; status: MarketStatus }> {
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
                    status: market.status,
                    isOpen: market.status === MarketStatus.OPEN,
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
                if (prismaHintIncludes(error, 'currency')) {
                    throw new NotFoundException('Currency not found');
                }
                if (prismaHintIncludes(error, 'country')) {
                    throw new ConflictException(
                        'Market cannot be deleted while it still has service countries assigned',
                    );
                }
                throw new ConflictException(
                    'Market cannot be deleted while it is still assigned to staff',
                );
            }
            if (error.code === 'P2025') {
                if (prismaHintIncludes(error, 'currency')) {
                    throw new NotFoundException('Currency not found');
                }
                throw new NotFoundException('Market not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
