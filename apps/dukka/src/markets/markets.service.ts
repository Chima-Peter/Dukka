import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    GENERAL_JOBS,
    GeneralQueueService,
    MAIL_TEMPLATES,
    MailQueueService,
} from '@app/queues';
import {
    MarketStatus,
    NotificationPublisher,
    NotificationType,
    RestCountriesIpService,
} from '@app/common';
import { prismaHintIncludes } from '../shared/prisma-relation-error.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorBelongsToMarkets,
    assertActorHasScopedAccess,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import { StaffService } from '../staff/staff.service.js';
import type { StaffMemberSummary } from '../staff/types/staff.types.js';
import type { CreateMarketDto } from './dto/create-market.dto.js';
import type { UpdateMarketDto } from './dto/update-market.dto.js';
import type { ValidateMarketsDto } from './dto/validate-markets.dto.js';
import { toMarketResponse, type MarketResponse } from './mappers/market.mapper.js';
import { MarketsRepository } from './markets.repository.js';
import type {
    MarketSearchMatch,
    MarketWithCurrency,
} from './types/market.type.js';

@Injectable()
export class MarketsService {
    private readonly logger = new Logger(MarketsService.name);

    constructor(
        private readonly marketsRepository: MarketsRepository,
        private readonly staffService: StaffService,
        private readonly mailQueueService: MailQueueService,
        private readonly generalQueueService: GeneralQueueService,
        private readonly notificationPublisher: NotificationPublisher,
        private readonly restCountriesIpService: RestCountriesIpService,
    ) {}

    async create(data: CreateMarketDto): Promise<MarketResponse> {
        try {
            this.logger.log(`Creating market ${data.code}`);
            const market = await this.marketsRepository.create(data);
            this.logger.log(`Market created ${market.id}`);
            return toMarketResponse(market);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(
        market_ids: string[],
        status?: MarketStatus,
    ): Promise<MarketResponse[]> {
        try {
            this.logger.log('Fetching markets');
            const markets = await this.marketsRepository.findAll(
                market_ids,
                status,
            );
            this.logger.log('Fetched markets');
            return markets.map(toMarketResponse);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        market_ids: string[],
    ): Promise<MarketResponse> {
        try {
            this.logger.log(`Fetching market ${id}`);
            assertActorBelongsToMarkets(market_ids, [id]);
            const market = await this.marketsRepository.findById(id);
            if (!market) {
                throw new NotFoundException('Market not found');
            }
            this.logger.log(`Fetched market ${id}`);
            return toMarketResponse(market);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findStaff(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<StaffMemberSummary[]> {
        try {
            this.logger.log(`Fetching staff for market ${id}`);
            const market = await this.findByIdOrThrow(id);
            assertActorHasScopedAccess(actor, { market_id: market.id });
            const staff = await this.staffService.findSummariesByMarketId(
                market.id,
            );
            this.logger.log(`Fetched staff for market ${id}`);
            return staff;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByIdOrThrow(id: string): Promise<MarketWithCurrency> {
        const market = await this.marketsRepository.findById(id);
        if (!market) {
            throw new NotFoundException('Market not found');
        }
        return market;
    }

    async requireOpenMarket(
        id: string,
        staffMarketIds?: string[],
    ): Promise<MarketWithCurrency> {
        const market = await this.findByIdOrThrow(id);
        if (market.status !== MarketStatus.OPEN) {
            throw new BadRequestException('Market is not open');
        }
        if (staffMarketIds !== undefined) {
            assertActorBelongsToMarkets(staffMarketIds, [id]);
        }
        return market;
    }

    async searchByIp(clientIp?: string): Promise<MarketSearchMatch | null> {
        if (!clientIp) {
            this.logger.warn('No client IP available; skipping market search');
            return null;
        }

        this.logger.log(`Searching market by IP: ${clientIp}`);
        const iso2 = await this.restCountriesIpService.resolveIso2(clientIp);
        if (!iso2) {
            this.logger.warn(
                `REST Countries lookup failed for ${clientIp}; falling back to Nigerian market`,
            );
            return this.marketsRepository.findOpenByIso2('NG');
        }

        const match = await this.marketsRepository.findOpenByIso2(iso2);
        if (!match) {
            this.logger.warn(`No open market found for iso2 ${iso2}`);
            return null;
        }

        this.logger.log(`Resolved market ${match.iso2} from IP ${clientIp}`);
        return match;
    }

    async getCashLimit(marketId: string): Promise<number> {
        try {
            const market =
                await this.marketsRepository.findCashLimitById(marketId);
            if (!market) {
                throw new NotFoundException('Market not found');
            }
            return Number(market.cash_limit.toString());
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
            this.logger.log(
                `Validated ${data.market_ids.length} market id(s)`,
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
        actor: ScopedAccessActor,
    ): Promise<MarketResponse> {
        try {
            this.logger.log(`Updating market ${id}`);
            assertActorHasScopedAccess(actor, { market_id: id });
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
            return toMarketResponse(market);
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<MarketResponse> {
        try {
            this.logger.log(`Opening market ${id}`);
            assertActorHasScopedAccess(actor, { market_id: id });
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
            return toMarketResponse(market);
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<MarketResponse> {
        try {
            this.logger.log(`Closing market ${id}`);
            assertActorHasScopedAccess(actor, { market_id: id });
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
            return toMarketResponse(market);
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string, performed_by_staff_id: string): Promise<object> {
        try {
            this.logger.log(`Queueing market deletion ${id}`);
            const market = await this.marketsRepository.findById(id);
            if (!market) {
                throw new NotFoundException('Market not found');
            }
            if (market.status !== MarketStatus.CLOSED) {
                throw new BadRequestException(
                    'Close the market before deleting it',
                );
            }
            const [stateCount, warehouseCount] = await Promise.all([
                this.marketsRepository.countServiceStates(id),
                this.marketsRepository.countWarehouses(id),
            ]);
            if (stateCount > 0) {
                throw new ConflictException(
                    'Market cannot be deleted while it still has service states',
                );
            }
            if (warehouseCount > 0) {
                throw new ConflictException(
                    'Market cannot be deleted while it still has warehouses',
                );
            }

            await this.generalQueueService.enqueue(
                GENERAL_JOBS.MARKET_DELETED,
                {
                    market_id: market.id,
                    name: market.name,
                    code: market.code,
                    performed_by_staff_id,
                },
                { jobId: `market-deleted-${market.id}` },
            );

            this.logger.log(`Market deletion queued ${id}`);

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

        await Promise.all(
            contacts.map((contact) =>
                this.notificationPublisher.notifyStaff(contact.id, {
                    title: subject,
                    type: NotificationType.MARKET,
                    text: `${market.name} (${market.code}) is now ${market.status.toLowerCase()}.`,
                }),
            ),
        );
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (
            error instanceof Error &&
            (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS ||
                error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS)
        ) {
            throw new ForbiddenException(
                'Cannot operate outside your assigned scope',
            );
        }


        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                const target = Array.isArray(error.meta?.target)
                    ? error.meta.target.join(',')
                    : String(error.meta?.target ?? '');
                if (target.includes('iso2')) {
                    throw new ConflictException(
                        'A market with this iso2 already exists',
                    );
                }
                if (target.includes('iso3')) {
                    throw new ConflictException(
                        'A market with this iso3 already exists',
                    );
                }
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
                if (prismaHintIncludes(error, 'warehouse', 'service_state')) {
                    throw new ConflictException(
                        'Market cannot be deleted while related records still exist',
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
