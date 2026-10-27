import { Injectable } from '@nestjs/common';
import {
    OrderPaymentAttemptStatus,
    type PaymentMethod,
    type Prisma,
    PrismaService,
} from '@app/common';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import type { FindPaymentAttemptsDto } from './dto/find-payment-attempts.dto.js';
import type { FindPaymentMethodsDto } from './dto/find-payment-methods.dto.js';
import {
    marketPaymentMethodSelect,
    paymentAttemptDetailSelect,
    paymentAttemptSummarySelect,
    paymentMethodDetailSelect,
} from './mappers/payment.mapper.js';
import type {
    CreatePaymentAttemptInput,
    MarketPaymentMethodDetail,
    PaymentAttemptDetail,
    PaymentAttemptPage,
    PaymentMethodDetail,
    UpdatePaymentIntentInput,
} from './types/payment.type.js';

@Injectable()
export class PaymentsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createMethod(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
        return await this.prisma.paymentMethod.create({ data });
    }

    async findMethods(query: FindPaymentMethodsDto): Promise<PaymentMethod[]> {
        return await this.prisma.paymentMethod.findMany({
            where: this.buildMethodWhere(query),
            orderBy: { created_at: 'desc' },
        });
    }

    async findMethodDetailById(id: string): Promise<PaymentMethodDetail | null> {
        return await this.prisma.paymentMethod.findUnique({
            where: { id },
            select: paymentMethodDetailSelect,
        });
    }

    async findMarketPaymentMethod(
        paymentMethodId: string,
        marketId: string,
    ): Promise<MarketPaymentMethodDetail | null> {
        return await this.prisma.marketPaymentMethod.findUnique({
            where: {
                market_id_payment_method_id: {
                    market_id: marketId,
                    payment_method_id: paymentMethodId,
                },
            },
            select: marketPaymentMethodSelect,
        });
    }

    async approveForMarket(
        paymentMethodId: string,
        marketId: string,
    ): Promise<MarketPaymentMethodDetail> {
        return await this.prisma.marketPaymentMethod.create({
            data: {
                payment_method: { connect: { id: paymentMethodId } },
                market: { connect: { id: marketId } },
            },
            select: marketPaymentMethodSelect,
        });
    }

    async removeFromMarket(marketPaymentMethodId: string): Promise<void> {
        await this.prisma.marketPaymentMethod.delete({
            where: { id: marketPaymentMethodId },
        });
    }

    async findAttempts(
        query: FindPaymentAttemptsDto,
    ): Promise<PaymentAttemptPage> {
        const limit = query.limit ?? 20;
        const where = this.buildAttemptWhere(query);

        const records = await this.prisma.orderPaymentAttempt.findMany({
            where,
            select: paymentAttemptSummarySelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;

        return {
            items: page,
            next_cursor: hasMore ? page[page.length - 1].id : null,
        };
    }

    async findAttemptById(
        id: string,
        marketId: string,
    ): Promise<PaymentAttemptDetail | null> {
        return await this.prisma.orderPaymentAttempt.findFirst({
            where: {
                id,
                order: { market_id: marketId },
            },
            select: paymentAttemptDetailSelect,
        });
    }

    async hasPendingAttemptsForCustomer(
        customerId: string,
    ): Promise<boolean> {
        const pending = await this.prisma.orderPaymentAttempt.findFirst({
            where: {
                status: OrderPaymentAttemptStatus.PENDING,
                order: { customer_id: customerId },
            },
            select: { id: true },
        });
        return pending !== null;
    }

    async createAttempt(
        data: CreatePaymentAttemptInput,
    ): Promise<PaymentAttemptDetail> {
        return await this.prisma.orderPaymentAttempt.create({
            data: {
                payment_method_name: data.payment_method_name,
                expires_at: new Date(Date.now() + 60 * 60 * 1000),
                order: { connect: { id: data.order_id } },
                market_payment_method: {
                    connect: { id: data.market_payment_method_id },
                },
            },
            select: paymentAttemptDetailSelect,
        });
    }

    async updatePaymentIntent(
        id: string,
        data: UpdatePaymentIntentInput,
    ): Promise<PaymentAttemptDetail> {
        return await this.prisma.orderPaymentAttempt.update({
            where: { id },
            data: {
                payment_intent_id: data.payment_intent_id,
                ...(data.payment_intent_url !== undefined && {
                    payment_intent_url: data.payment_intent_url,
                }),
            },
            select: paymentAttemptDetailSelect,
        });
    }

    private buildMethodWhere(
        query: FindPaymentMethodsDto,
    ): Prisma.PaymentMethodWhereInput {
        const marketIds = query.market_ids;

        return {
            ...this.methodCreatedAtFilter(query.from_date, query.to_date),
            ...(marketIds !== undefined &&
                marketIds.length > 0 && {
                    market_payment_methods: {
                        some: { market_id: { in: marketIds } },
                    },
                }),
            ...(query.market_approved === true &&
                (marketIds === undefined || marketIds.length === 0) && {
                    market_payment_methods: { some: {} },
                }),
            ...(query.market_approved === false && {
                market_payment_methods: { none: {} },
            }),
        };
    }

    private methodCreatedAtFilter(
        fromDate?: string,
        toDate?: string,
    ): Pick<Prisma.PaymentMethodWhereInput, 'created_at'> {
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

    private buildAttemptWhere(
        query: FindPaymentAttemptsDto,
    ): Prisma.OrderPaymentAttemptWhereInput {
        const orderWhere: Prisma.OrderWhereInput = {
            market_id: query.market_id,
            ...(query.order_id !== undefined && { id: query.order_id }),
            ...(query.warehouse_id !== undefined && {
                warehouse_id: query.warehouse_id,
            }),
            ...(query.country_id !== undefined && {
                warehouse: { country_id: query.country_id },
            }),
            ...(query.customer_id !== undefined && {
                customer_id: query.customer_id,
            }),
            ...(query.is_guest === true && { customer_id: null }),
            ...(query.is_guest === false && { customer_id: { not: null } }),
            ...this.totalAmountFilter(query.min_price, query.max_price),
        };

        return {
            ...(query.status !== undefined && { status: query.status }),
            ...(query.payment_method_id !== undefined && {
                market_payment_method: {
                    payment_method_id: query.payment_method_id,
                },
            }),
            ...(query.payment_method_name !== undefined && {
                payment_method_name: {
                    contains: query.payment_method_name,
                    mode: 'insensitive',
                },
            }),
            ...this.createdAtFilter(query.from_date, query.to_date),
            order: orderWhere,
        };
    }

    private totalAmountFilter(
        minPrice?: number,
        maxPrice?: number,
    ): Pick<Prisma.OrderWhereInput, 'total_amount'> {
        if (minPrice === undefined && maxPrice === undefined) {
            return {};
        }

        return {
            total_amount: {
                ...(minPrice !== undefined && { gte: minPrice }),
                ...(maxPrice !== undefined && { lte: maxPrice }),
            },
        };
    }

    private createdAtFilter(
        fromDate?: string,
        toDate?: string,
    ): Pick<Prisma.OrderPaymentAttemptWhereInput, 'created_at'> {
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
