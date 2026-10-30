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
import {
    type Discount,
    DiscountType,
    type Promotion,
    PromotionMarketStatus,
    PromotionStatus,
} from '@app/common';
import type { AddPromotionMarketDto } from './dto/add-promotion-market.dto.js';
import type { CreateDiscountDto } from './dto/create-discount.dto.js';
import type { CreatePromotionDto } from './dto/create-promotion.dto.js';
import type { FindPromotionMarketTargetsDto } from './dto/find-promotion-market-targets.dto.js';
import type { FindPromotionUsagesDto } from './dto/find-promotion-usages.dto.js';
import type { FindPromotionsDto } from './dto/find-promotions.dto.js';
import type { PromotionMarketVariantsDto } from './dto/promotion-market-variants.dto.js';
import type { UpdateDiscountDto } from './dto/update-discount.dto.js';
import type { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import type { UpdatePromotionMarketDto } from './dto/update-promotion-market.dto.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { PromotionsRepository } from './promotions.repository.js';
import type {
    DiscountSummary,
    PromotionDetail,
    PromotionMarketDetail,
    PromotionSummary,
    PromotionTargetPage,
    PromotionUsagePage,
    PromotionWithDiscount,
} from './types/promotion.type.js';

@Injectable()
export class PromotionsService {
    private readonly logger = new Logger(PromotionsService.name);

    constructor(
        private readonly promotionsRepository: PromotionsRepository,
    ) {}

    async create(data: CreatePromotionDto): Promise<PromotionWithDiscount> {
        try {
            this.logger.log(`Creating promotion ${data.code}`);
            const promotion = await this.promotionsRepository.create(data);
            this.logger.log(`Promotion created ${promotion.id}`);
            return promotion;
        } catch (error) {
            this.handleError(error);
        }
    }

    async createDiscount(data: CreateDiscountDto): Promise<Discount> {
        try {
            this.logger.log('Creating discount');
            this.validateDiscountValues(data.type, data.value);

            const discount =
                await this.promotionsRepository.createDiscount(data);
            this.logger.log(`Discount created ${discount.id}`);
            return discount;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(
        query: FindPromotionsDto,
        staffMarketIds: string[],
    ): Promise<PromotionSummary[]> {
        try {
            this.logger.log(
                `Fetching promotions for market ${query.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [query.market_id]);
            const promotions =
                await this.promotionsRepository.findAll(query);
            this.logger.log(
                `Fetched promotions for market ${query.market_id}`,
            );
            return promotions;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findUsages(
        query: FindPromotionUsagesDto,
        staffMarketIds: string[],
    ): Promise<PromotionUsagePage> {
        try {
            const marketIds = this.resolveUsageMarketIds(
                staffMarketIds,
                query.market_id,
            );
            this.logger.log(
                `Fetching promotion usages for ${marketIds.length} market(s)`,
            );
            if (marketIds.length === 0) {
                this.logger.log(
                    `Fetched promotion usages for ${marketIds.length} market(s)`,
                );
                return { items: [], next_cursor: null };
            }
            const usages = await this.promotionsRepository.findUsages(
                query,
                marketIds,
            );
            this.logger.log(
                `Fetched promotion usages for ${marketIds.length} market(s)`,
            );
            return usages;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAllDiscounts(): Promise<DiscountSummary[]> {
        try {
            this.logger.log('Fetching discounts');
            const discounts =
                await this.promotionsRepository.findAllDiscounts();
            this.logger.log('Fetched discounts');
            return discounts;
        } catch (error) {
            this.handleError(error);
        }
    }

    async addMarket(
        promotionId: string,
        data: AddPromotionMarketDto,
        staffMarketIds: string[],
    ): Promise<PromotionMarketDetail> {
        try {
            this.logger.log(
                `Adding market ${data.market_id} to promotion ${promotionId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            this.validatePromotionMarketRules(data);
            await this.assertNoValidVariantConflicts(
                data.variant_ids,
                new Date(data.start_date),
                new Date(data.end_date),
            );

            const promotionMarket = await this.promotionsRepository.addMarket(
                promotionId,
                data,
            );
            this.logger.log(
                `Market ${data.market_id} added to promotion ${promotionId}`,
            );
            return promotionMarket;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<PromotionDetail> {
        try {
            this.logger.log(`Fetching promotion ${id}`);
            const promotion = await this.promotionsRepository.findById(id);
            if (!promotion) {
                throw new NotFoundException('Promotion not found');
            }
            this.logger.log(`Fetched promotion ${id}`);
            return promotion;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdatePromotionDto,
    ): Promise<Promotion> {
        try {
            this.logger.log(`Updating promotion ${id}`);
            const promotion = await this.promotionsRepository.update(id, data);
            this.logger.log(`Promotion updated ${id}`);
            return promotion;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateDiscount(
        id: string,
        data: UpdateDiscountDto,
    ): Promise<Discount> {
        try {
            this.logger.log(`Updating discount ${id}`);
            const existing =
                await this.promotionsRepository.findDiscountById(id);
            if (!existing) {
                throw new NotFoundException('Discount not found');
            }

            const type = data.type ?? existing.type;
            const value =
                data.value !== undefined
                    ? data.value
                    : Number(existing.value);
            this.validateDiscountValues(type, value);

            const discount = await this.promotionsRepository.updateDiscount(
                id,
                data,
            );
            this.logger.log(`Discount updated ${id}`);
            return discount;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateMarket(
        promotionId: string,
        promotionMarketId: string,
        data: UpdatePromotionMarketDto,
        staffMarketIds: string[],
    ): Promise<PromotionMarketDetail> {
        try {
            this.logger.log(
                `Updating promotion market ${promotionMarketId}`,
            );
            const existing =
                await this.promotionsRepository.findPromotionMarket(
                    promotionId,
                    promotionMarketId,
                );
            if (!existing) {
                throw new NotFoundException('Promotion market not found');
            }
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            this.validatePromotionMarketDateUpdate(data, existing);

            const promotionMarket =
                await this.promotionsRepository.updateMarket(
                    existing.id,
                    data,
                );
            this.logger.log(`Promotion market updated ${promotionMarketId}`);
            return promotionMarket;
        } catch (error) {
            this.handleError(error);
        }
    }

    async addVariants(
        promotionId: string,
        promotionMarketId: string,
        data: PromotionMarketVariantsDto,
        staffMarketIds: string[],
    ): Promise<PromotionMarketDetail> {
        try {
            this.logger.log(
                `Adding ${data.variant_ids.length} variant(s) to promotion market ${promotionMarketId}`,
            );
            const existing =
                await this.promotionsRepository.findPromotionMarket(
                    promotionId,
                    promotionMarketId,
                );
            if (!existing) {
                throw new NotFoundException('Promotion market not found');
            }
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);

            if (existing.status === PromotionMarketStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired promotion markets cannot be updated',
                );
            }

            if (existing.status === PromotionMarketStatus.INACTIVE) {
                throw new BadRequestException(
                    'Inactive promotion markets cannot be updated',
                );
            }

            await this.assertNoValidVariantConflicts(
                data.variant_ids,
                existing.start_date,
                existing.end_date,
                existing.id,
            );

            const promotionMarket =
                await this.promotionsRepository.addVariants(
                    existing.id,
                    data.variant_ids,
                );
            this.logger.log(
                `Added variants to promotion market ${promotionMarketId}`,
            );
            return promotionMarket;
        } catch (error) {
            this.handleError(error);
        }
    }

    async removeVariants(
        promotionId: string,
        promotionMarketId: string,
        data: PromotionMarketVariantsDto,
        staffMarketIds: string[],
    ): Promise<{ removed: number }> {
        try {
            this.logger.log(
                `Removing ${data.variant_ids.length} variant(s) from promotion market ${promotionMarketId}`,
            );
            const existing =
                await this.promotionsRepository.findPromotionMarket(
                    promotionId,
                    promotionMarketId,
                );
            if (!existing) {
                throw new NotFoundException('Promotion market not found');
            }
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);

            if (existing.status === PromotionMarketStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired promotion markets cannot be updated',
                );
            }

            if (existing.status === PromotionMarketStatus.INACTIVE) {
                throw new BadRequestException(
                    'Inactive promotion markets cannot be updated',
                );
            }

            const removed = await this.promotionsRepository.removeVariants(
                existing.id,
                data.variant_ids,
            );
            if (removed === 0) {
                throw new NotFoundException(
                    'None of the variants are assigned to this promotion market',
                );
            }

            this.logger.log(
                `Removed ${removed} variant(s) from promotion market ${promotionMarketId}`,
            );
            return { removed };
        } catch (error) {
            this.handleError(error);
        }
    }

    async activate(id: string): Promise<Promotion> {
        try {
            this.logger.log(`Activating promotion ${id}`);
            const existing =
                await this.promotionsRepository.findPromotionStatus(id);
            if (!existing) {
                throw new NotFoundException('Promotion not found');
            }
            if (existing.status === PromotionStatus.ACTIVE) {
                throw new BadRequestException('Promotion is already active');
            }
            if (existing.status === PromotionStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired promotions cannot be activated',
                );
            }
            const promotion =
                await this.promotionsRepository.setPromotionStatus(
                    id,
                    PromotionStatus.ACTIVE,
                );
            this.logger.log(`Promotion activated ${id}`);
            return promotion;
        } catch (error) {
            this.handleError(error);
        }
    }

    async deactivate(id: string): Promise<Promotion> {
        try {
            this.logger.log(`Deactivating promotion ${id}`);
            const existing =
                await this.promotionsRepository.findPromotionStatus(id);
            if (!existing) {
                throw new NotFoundException('Promotion not found');
            }
            if (existing.status === PromotionStatus.INACTIVE) {
                throw new BadRequestException('Promotion is already inactive');
            }
            if (existing.status === PromotionStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired promotions cannot be deactivated',
                );
            }
            const promotion =
                await this.promotionsRepository.deactivateWithMarkets(id);
            this.logger.log(`Promotion deactivated ${id}`);
            return promotion;
        } catch (error) {
            this.handleError(error);
        }
    }

    async activateMarket(
        promotionId: string,
        promotionMarketId: string,
        staffMarketIds: string[],
    ): Promise<PromotionMarketDetail> {
        try {
            this.logger.log(
                `Activating promotion market ${promotionMarketId}`,
            );
            const existing =
                await this.promotionsRepository.findPromotionMarket(
                    promotionId,
                    promotionMarketId,
                );
            if (!existing) {
                throw new NotFoundException('Promotion market not found');
            }
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === PromotionMarketStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired promotion markets cannot be activated',
                );
            }
            if (existing.status === PromotionMarketStatus.ACTIVE) {
                throw new BadRequestException(
                    'Promotion market is already active',
                );
            }
            const variantIds =
                await this.promotionsRepository.findPromotionMarketVariantIds(
                    existing.id,
                );
            await this.assertNoValidVariantConflicts(
                variantIds,
                existing.start_date,
                existing.end_date,
                existing.id,
            );
            const promotionMarket =
                await this.promotionsRepository.setPromotionMarketStatus(
                    existing.id,
                    PromotionMarketStatus.ACTIVE,
                );
            this.logger.log(`Promotion market activated ${promotionMarketId}`);
            return promotionMarket;
        } catch (error) {
            this.handleError(error);
        }
    }

    async deactivateMarket(
        promotionId: string,
        promotionMarketId: string,
        staffMarketIds: string[],
    ): Promise<PromotionMarketDetail> {
        try {
            this.logger.log(
                `Deactivating promotion market ${promotionMarketId}`,
            );
            const existing =
                await this.promotionsRepository.findPromotionMarket(
                    promotionId,
                    promotionMarketId,
                );
            if (!existing) {
                throw new NotFoundException('Promotion market not found');
            }
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === PromotionMarketStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired promotion markets cannot be deactivated',
                );
            }
            if (existing.status === PromotionMarketStatus.INACTIVE) {
                throw new BadRequestException(
                    'Promotion market is already inactive',
                );
            }
            const promotionMarket =
                await this.promotionsRepository.setPromotionMarketStatus(
                    existing.id,
                    PromotionMarketStatus.INACTIVE,
                );
            this.logger.log(
                `Promotion market deactivated ${promotionMarketId}`,
            );
            return promotionMarket;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findMarketTargets(
        promotionId: string,
        promotionMarketId: string,
        query: FindPromotionMarketTargetsDto,
    ): Promise<PromotionTargetPage> {
        try {
            this.logger.log(
                `Fetching targets for promotion market ${promotionMarketId}`,
            );
            const promotionMarket =
                await this.promotionsRepository.findPromotionMarket(
                    promotionId,
                    promotionMarketId,
                );
            if (!promotionMarket) {
                throw new NotFoundException('Promotion market not found');
            }
            const targets = await this.promotionsRepository.findMarketTargets(
                promotionMarket.id,
                query,
            );
            this.logger.log(
                `Fetched targets for promotion market ${promotionMarketId}`,
            );
            return targets;
        } catch (error) {
            this.handleError(error);
        }
    }

    private resolveUsageMarketIds(
        staffMarketIds: string[],
        marketId?: string,
    ): string[] {
        if (marketId !== undefined) {
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            return [marketId];
        }
        return staffMarketIds;
    }

    private validateDiscountValues(
        type: DiscountType,
        value: number,
    ): void {
        if (type === DiscountType.PERCENTAGE && value > 100) {
            throw new BadRequestException(
                'Percentage discount value cannot exceed 100',
            );
        }
    }

    private validatePromotionMarketDateUpdate(
        data: UpdatePromotionMarketDto,
        existing: { start_date: Date; end_date: Date },
    ): void {
        if (
            data.start_date === undefined &&
            data.end_date === undefined
        ) {
            return;
        }

        const startDate = new Date(
            data.start_date ?? existing.start_date,
        );
        const endDate = new Date(data.end_date ?? existing.end_date);

        if (endDate <= startDate) {
            throw new BadRequestException(
                'end_date must be after start_date',
            );
        }
    }

    private validatePromotionMarketRules(data: AddPromotionMarketDto): void {
        if (new Date(data.end_date) <= new Date(data.start_date)) {
            throw new BadRequestException(
                'end_date must be after start_date',
            );
        }

        if (data.variant_ids.length === 0) {
            throw new BadRequestException(
                'variant_ids are required',
            );
        }
    }

    private async assertNoValidVariantConflicts(
        variantIds: string[],
        startDate: Date,
        endDate: Date,
        excludePromotionMarketId?: string,
    ): Promise<void> {
        if (variantIds.length === 0) {
            return;
        }

        const conflictingVariantIds =
            await this.promotionsRepository.findConflictingVariantIds(
                variantIds,
                startDate,
                endDate,
                excludePromotionMarketId,
            );

        if (conflictingVariantIds.length > 0) {
            throw new ConflictException(
                'One or more variants already have a valid promotion for this period',
            );
        }
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

                if (target.includes('code')) {
                    throw new ConflictException(
                        'A promotion with this code already exists',
                    );
                }
                if (
                    target.includes('promotion_id') &&
                    target.includes('market_id')
                ) {
                    throw new ConflictException(
                        'Promotion already assigned to this market',
                    );
                }
                if (target.includes('variant_id')) {
                    throw new ConflictException(
                        'Variant already assigned to this promotion market',
                    );
                }
                throw new ConflictException(
                    'A conflicting promotion record already exists',
                );
            }

            if (error.code === 'P2003') {
                this.logger.warn(`Foreign key error: ${error.message}`);
                throw this.relationNotFound(error);
            }

            if (error.code === 'P2025') {
                throw this.relationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private relationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        const model = prismaMissingRecordModel(error);

        if (model === 'promotion') {
            return new NotFoundException('Promotion not found');
        }
        if (model === 'discount') {
            return new NotFoundException('Discount not found');
        }
        if (model === 'market') {
            return new NotFoundException('Market not found');
        }
        if (model === 'marketvariant' || model === 'variant') {
            return new NotFoundException('Variant not found');
        }

        if (prismaHintIncludes(error, 'promotion_id', "'promotion'")) {
            return new NotFoundException('Promotion not found');
        }
        if (prismaHintIncludes(error, 'discount_id', "'discount'")) {
            return new NotFoundException('Discount not found');
        }
        if (prismaHintIncludes(error, 'market_id', "'market'")) {
            return new NotFoundException('Market not found');
        }
        if (
            prismaHintIncludes(
                error,
                'variant_id',
                "'marketvariant'",
                "'variant'",
            )
        ) {
            return new NotFoundException('Variant not found');
        }

        return new NotFoundException('Related record not found');
    }
}
