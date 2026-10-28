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
    type Coupon,
    CouponStatus,
    CouponType,
} from '@app/common';
import type { CreateCouponDto } from './dto/create-coupon.dto.js';
import type { FindCouponUsagesDto } from './dto/find-coupon-usages.dto.js';
import type { FindCouponsDto } from './dto/find-coupons.dto.js';
import type { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { CouponsRepository } from './coupons.repository.js';
import type { CouponPage, CouponUsagePage } from './types/coupon.type.js';

@Injectable()
export class CouponsService {
    private readonly logger = new Logger(CouponsService.name);

    constructor(private readonly couponsRepository: CouponsRepository) {}

    async create(data: CreateCouponDto): Promise<Coupon> {
        try {
            this.logger.log(`Creating coupon ${data.code}`);
            this.validateCouponValues(data.type, data.value);
            this.validateExpiresAt(data.expires_at);

            const coupon = await this.couponsRepository.create(data);
            this.logger.log(`Coupon created ${coupon.id}`);
            return coupon;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindCouponsDto): Promise<CouponPage> {
        try {
            this.logger.log('Fetching coupons');
            return await this.couponsRepository.findAll(query);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findUsages(
        query: FindCouponUsagesDto,
        staffMarketIds: string[],
    ): Promise<CouponUsagePage> {
        try {
            const marketIds = this.resolveUsageMarketIds(
                staffMarketIds,
                query.market_id,
            );
            this.logger.log(
                `Fetching coupon usages for ${marketIds.length} market(s)`,
            );
            if (marketIds.length === 0) {
                return { items: [], next_cursor: null };
            }
            return await this.couponsRepository.findUsages(query, marketIds);
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateCouponDto): Promise<Coupon> {
        try {
            this.logger.log(`Updating coupon ${id}`);
            const existing = await this.couponsRepository.findById(id);
            if (!existing) {
                throw new NotFoundException('Coupon not found');
            }

            const type = data.type ?? existing.type;
            const value =
                data.value !== undefined
                    ? data.value
                    : Number(existing.value);
            this.validateCouponValues(type, value);

            if (data.expires_at !== undefined) {
                this.validateExpiresAt(data.expires_at);
            }

            const coupon = await this.couponsRepository.update(id, data);
            this.logger.log(`Coupon updated ${id}`);
            return coupon;
        } catch (error) {
            this.handleError(error);
        }
    }

    async activate(id: string): Promise<Coupon> {
        try {
            this.logger.log(`Activating coupon ${id}`);
            const existing = await this.couponsRepository.findStatus(id);
            if (!existing) {
                throw new NotFoundException('Coupon not found');
            }
            if (existing.status === CouponStatus.ACTIVE) {
                throw new BadRequestException('Coupon is already active');
            }
            if (existing.status === CouponStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired coupons cannot be activated',
                );
            }

            const coupon = await this.couponsRepository.setStatus(
                id,
                CouponStatus.ACTIVE,
            );
            this.logger.log(`Coupon activated ${id}`);
            return coupon;
        } catch (error) {
            this.handleError(error);
        }
    }

    async deactivate(id: string): Promise<Coupon> {
        try {
            this.logger.log(`Deactivating coupon ${id}`);
            const existing = await this.couponsRepository.findStatus(id);
            if (!existing) {
                throw new NotFoundException('Coupon not found');
            }
            if (existing.status === CouponStatus.INACTIVE) {
                throw new BadRequestException('Coupon is already inactive');
            }
            if (existing.status === CouponStatus.EXPIRED) {
                throw new BadRequestException(
                    'Expired coupons cannot be deactivated',
                );
            }

            const coupon = await this.couponsRepository.setStatus(
                id,
                CouponStatus.INACTIVE,
            );
            this.logger.log(`Coupon deactivated ${id}`);
            return coupon;
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

    private validateCouponValues(type: CouponType, value: number): void {
        if (type === CouponType.PERCENTAGE && value > 100) {
            throw new BadRequestException(
                'Percentage coupon value cannot exceed 100',
            );
        }
    }

    private validateExpiresAt(expiresAt: string): void {
        if (new Date(expiresAt) <= new Date()) {
            throw new BadRequestException('expires_at must be in the future');
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
                        'A coupon with this code already exists',
                    );
                }
                throw new ConflictException(
                    'A conflicting coupon record already exists',
                );
            }

            if (error.code === 'P2025') {
                throw new NotFoundException('Coupon not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
