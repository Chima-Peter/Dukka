import { Injectable } from '@nestjs/common';
import {
    type Coupon,
    CouponStatus,
    Prisma,
    PrismaService,
} from '@app/common';
import type { CreateCouponDto } from './dto/create-coupon.dto.js';
import type { FindCouponUsagesDto } from './dto/find-coupon-usages.dto.js';
import type { FindCouponsDto } from './dto/find-coupons.dto.js';
import type { UpdateCouponDto } from './dto/update-coupon.dto.js';
import {
    couponUsageSelect,
    type CouponPage,
    type CouponSummary,
    type CouponUsagePage,
} from './types/coupon.type.js';

@Injectable()
export class CouponsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCouponDto): Promise<Coupon> {
        return await this.prisma.coupon.create({
            data: {
                code: data.code,
                type: data.type,
                value: data.value,
                max_discount_amount: data.max_discount_amount,
                expires_at: data.expires_at,
            },
        });
    }

    async findUsages(
        query: FindCouponUsagesDto,
        marketIds: string[],
    ): Promise<CouponUsagePage> {
        const limit = query.limit ?? 20;
        const where: Prisma.CouponUsageWhereInput = {
            order: { market_id: { in: marketIds } },
            ...(query.order_id !== undefined && { order_id: query.order_id }),
            ...(query.customer_id !== undefined && {
                customer_id: query.customer_id,
            }),
            ...this.createdAtFilter(query.from_date, query.to_date),
        };

        const records = await this.prisma.couponUsage.findMany({
            where,
            select: couponUsageSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const items = hasMore ? records.slice(0, limit) : records;

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }

    async findAll(query: FindCouponsDto): Promise<CouponPage> {
        const limit = query.limit ?? 20;
        const where: Prisma.CouponWhereInput = {
            ...(query.status !== undefined && { status: query.status }),
            ...(query.type !== undefined && { type: query.type }),
            ...(query.code !== undefined && {
                code: {
                    contains: query.code,
                    mode: 'insensitive',
                },
            }),
        };

        const records = await this.prisma.coupon.findMany({
            where,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
            include: {
                _count: { select: { coupon_usages: true } },
            },
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items: CouponSummary[] = page.map((record) => {
            const { _count, ...coupon } = record;
            return {
                ...coupon,
                usage_count: _count.coupon_usages,
            };
        });

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }

    async findById(id: string): Promise<Coupon | null> {
        return await this.prisma.coupon.findUnique({
            where: { id },
        });
    }

    async findStatus(
        id: string,
    ): Promise<{ id: string; status: CouponStatus } | null> {
        return await this.prisma.coupon.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
    }

    async update(id: string, data: UpdateCouponDto): Promise<Coupon> {
        return await this.prisma.coupon.update({
            where: { id },
            data: {
                ...(data.code !== undefined && { code: data.code }),
                ...(data.type !== undefined && { type: data.type }),
                ...(data.value !== undefined && { value: data.value }),
                ...(data.max_discount_amount !== undefined && {
                    max_discount_amount: data.max_discount_amount,
                }),
                ...(data.expires_at !== undefined && {
                    expires_at: data.expires_at,
                }),
            },
        });
    }

    async setStatus(id: string, status: CouponStatus): Promise<Coupon> {
        return await this.prisma.coupon.update({
            where: { id },
            data: { status },
        });
    }

    private createdAtFilter(
        fromDate?: string,
        toDate?: string,
    ): Pick<Prisma.CouponUsageWhereInput, 'created_at'> {
        if (fromDate === undefined && toDate === undefined) {
            return {};
        }

        return {
            created_at: {
                ...(fromDate !== undefined && { gte: new Date(fromDate) }),
                ...(toDate !== undefined && { lte: new Date(toDate) }),
            },
        };
    }
}
