import { Injectable } from '@nestjs/common';
import {
    OrderPaymentAttemptStatus,
    OrderRefundStatus,
    OrderStatus,
    Prisma,
    type PaymentMethod,
    PrismaService,
} from '@app/common';
import { OrdersRepository } from '../orders/orders.repository.js';
import type { TransitionOrderStatusResult } from '../orders/types/order.type.js';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import type { FindPaymentAttemptsDto } from './dto/find-payment-attempts.dto.js';
import type { FindPaymentMethodsDto } from './dto/find-payment-methods.dto.js';
import {
    marketPaymentMethodSelect,
    orderRefundDetailSelect,
    paymentAttemptDetailSelect,
    paymentAttemptSummarySelect,
    paymentMethodDetailSelect,
} from './mappers/payment.mapper.js';
import type {
    ConvertCashAttemptToPaystackInput,
    CreateOrderRefundInput,
    CreatePaymentAttemptInput,
    MarkRefundStatusInput,
    MarketPaymentMethodDetail,
    OrderRefundDetail,
    PaymentAttemptDetail,
    PaymentAttemptPage,
    PaymentMethodDetail,
    UpdatePaymentIntentInput,
} from './types/payment.type.js';

@Injectable()
export class PaymentsRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ordersRepository: OrdersRepository,
    ) {}

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

    async findMarketPaymentMethods(
        marketId: string,
    ): Promise<MarketPaymentMethodDetail[]> {
        return await this.prisma.marketPaymentMethod.findMany({
            where: { market_id: marketId },
            select: marketPaymentMethodSelect,
            orderBy: { created_at: 'asc' },
        });
    }

    async findPaystackMarketPaymentMethod(
        marketId: string,
    ): Promise<MarketPaymentMethodDetail | null> {
        return await this.prisma.marketPaymentMethod.findFirst({
            where: {
                market_id: marketId,
                payment_method: {
                    name: {
                        equals: 'paystack',
                        mode: 'insensitive',
                    },
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

    async findAttemptByOrderId(
        orderId: string,
    ): Promise<PaymentAttemptDetail | null> {
        return await this.prisma.orderPaymentAttempt.findUnique({
            where: { order_id: orderId },
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
        tx?: Prisma.TransactionClient,
    ): Promise<PaymentAttemptDetail> {
        const db = tx ?? this.prisma;
        return await db.orderPaymentAttempt.create({
            data: {
                ...(data.status !== undefined && { status: data.status }),
                ...(data.payment_intent_id !== undefined && {
                    payment_intent_id: data.payment_intent_id,
                }),
                ...(data.payment_intent_url !== undefined && {
                    payment_intent_url: data.payment_intent_url,
                }),
                payment_method_name: data.payment_method_name,
                expires_at: new Date(Date.now() + 14 * 60 * 1000),
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

    async convertCashAttemptToPaystack(
        id: string,
        data: ConvertCashAttemptToPaystackInput,
    ): Promise<PaymentAttemptDetail> {
        return await this.prisma.orderPaymentAttempt.update({
            where: { id },
            data: {
                status: OrderPaymentAttemptStatus.PENDING,
                payment_intent_id: data.payment_intent_id,
                payment_intent_url: data.payment_intent_url,
                expires_at: new Date(Date.now() + 14 * 60 * 1000),
            },
            select: paymentAttemptDetailSelect,
        });
    }

    async markAttemptSuccess(
        id: string,
        tx?: Prisma.TransactionClient,
    ): Promise<PaymentAttemptDetail> {
        const db = tx ?? this.prisma;
        return await db.orderPaymentAttempt.update({
            where: { id },
            data: { status: OrderPaymentAttemptStatus.SUCCESS },
            select: paymentAttemptDetailSelect,
        });
    }

    async completeSuccessfulPayment(
        paymentAttemptId: string,
        orderId: string,
    ): Promise<TransitionOrderStatusResult> {
        return await this.prisma.$transaction(async (tx) => {
            await this.markAttemptSuccess(paymentAttemptId, tx);
            return await this.ordersRepository.transitionStatus(
                {
                    order_id: orderId,
                    from_statuses: [OrderStatus.PENDING],
                    to_status: OrderStatus.PROCESSING,
                },
                tx,
            );
        });
    }

    async findAttemptDetailById(
        id: string,
    ): Promise<PaymentAttemptDetail | null> {
        return await this.prisma.orderPaymentAttempt.findUnique({
            where: { id },
            select: paymentAttemptDetailSelect,
        });
    }

    async findAttemptByPaymentIntentId(
        paymentIntentId: string,
    ): Promise<PaymentAttemptDetail | null> {
        return await this.prisma.orderPaymentAttempt.findFirst({
            where: { payment_intent_id: paymentIntentId },
            select: paymentAttemptDetailSelect,
        });
    }

    async findRefundById(
        refundId: string,
    ): Promise<OrderRefundDetail | null> {
        return await this.prisma.orderRefund.findUnique({
            where: { id: refundId },
            select: orderRefundDetailSelect,
        });
    }

    async findRefundsByOrderId(
        orderId: string,
    ): Promise<OrderRefundDetail[]> {
        return await this.prisma.orderRefund.findMany({
            where: { order_id: orderId },
            select: orderRefundDetailSelect,
            orderBy: { created_at: 'desc' },
        });
    }

    async createRefund(
        input: CreateOrderRefundInput,
    ): Promise<OrderRefundDetail> {
        return await this.prisma.orderRefund.create({
            data: {
                amount: input.amount,
                currency: input.currency,
                provider: input.provider,
                payment_reference: input.payment_reference,
                order_id: input.order_id,
                status: OrderRefundStatus.PENDING,
                ...(input.order_payment_attempt_id
                    ? {
                          order_payment_attempt_id:
                              input.order_payment_attempt_id,
                      }
                    : {}),
                ...(input.customer_note !== undefined && {
                    customer_note: input.customer_note,
                }),
                ...(input.merchant_note !== undefined && {
                    merchant_note: input.merchant_note,
                }),
                ...(input.provider_refund_id !== undefined && {
                    provider_refund_id: input.provider_refund_id,
                }),
                ...(input.metadata !== undefined && {
                    metadata:
                        input.metadata === null
                            ? Prisma.JsonNull
                            : input.metadata,
                }),
            },
            select: orderRefundDetailSelect,
        });
    }

    async attachProviderRefundId(
        id: string,
        providerRefundId: string,
    ): Promise<OrderRefundDetail> {
        return await this.prisma.orderRefund.update({
            where: { id },
            data: { provider_refund_id: providerRefundId },
            select: orderRefundDetailSelect,
        });
    }

    async markRefundStatusIfPending(
        input: MarkRefundStatusInput,
    ): Promise<OrderRefundDetail | null> {
        const updated = await this.prisma.orderRefund.updateManyAndReturn({
            where: {
                id: input.id,
                status: OrderRefundStatus.PENDING,
            },
            data: {
                status: input.status,
                ...(input.refunded_at !== undefined && {
                    refunded_at: input.refunded_at,
                }),
            },
            select: orderRefundDetailSelect,
        });

        return updated[0] ?? null;
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
