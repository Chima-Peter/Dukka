import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
    OrderStatus,
    Prisma,
    type Order,
    PrismaService,
} from '@app/common';
import type { FindOrdersDto } from './dto/find-orders.dto.js';
import type { FindStaffOrdersDto } from './dto/find-staff-orders.dto.js';
import {
    customerOrderDetailSelect,
    orderSummarySelect,
    staffOrderDetailSelect,
    toOrderSummary,
} from './mappers/order.mapper.js';
import type {
    CreateGuestOrderInput,
    CreateOrderBase,
    CreateOrderInput,
    CreateOrderItemInput,
    GuestAddressSnapshot,
} from './types/create-order.type.js';
import type {
    CustomerOrderDetail,
    DbClient,
    OrderSummaryPage,
    StaffOrderDetail,
    TransitionOrderStatusInput,
    TransitionOrderStatusResult,
} from './types/order.type.js';

@Injectable()
export class OrdersRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createForCustomer(
        customerId: string,
        data: CreateOrderInput,
        tx?: Prisma.TransactionClient,
    ): Promise<Order> {
        return await this.create(
            {
                ...data,
                customer_id: customerId,
            },
            undefined,
            tx,
        );
    }

    async createForGuest(
        data: CreateGuestOrderInput,
        tx?: Prisma.TransactionClient,
    ): Promise<Order> {
        return await this.create(
            {
                currency: data.currency,
                subtotal: data.subtotal,
                shipping_fee: data.shipping_fee,
                discount_amount: data.discount_amount,
                points_discount: data.points_discount,
                coupon_discount: data.coupon_discount,
                total_amount: data.total_amount,
                market_id: data.market_id,
                warehouse_id: data.warehouse_id,
                idempotency_key: data.idempotency_key,
                items: data.items,
                coupon_usage_id: data.coupon_usage_id,
                shipping_address: this.guestAddressSnapshot(
                    data.shipping_address,
                    data.market_id,
                ),
                billing_address: this.guestAddressSnapshot(
                    data.billing_address,
                    data.market_id,
                ),
                guest_email: data.guest_email,
                guest_name: data.guest_name,
                guest_phone_number: data.guest_phone_number,
            },
            undefined,
            tx,
        );
    }

    async createOrder(
        data: CreateOrderBase,
        options?: {
            status?: OrderStatus;
            tx?: Prisma.TransactionClient;
        },
    ): Promise<Order> {
        return await this.create(data, options?.status, options?.tx);
    }

    async findByIdempotencyKey(
        idempotencyKey: string,
    ): Promise<Order | null> {
        return await this.prisma.order.findUnique({
            where: { idempotency_key: idempotencyKey },
        });
    }

    async findForCustomer(
        customerId: string,
        query: FindOrdersDto,
    ): Promise<OrderSummaryPage> {
        return await this.findSummaries(
            {
                customer_id: customerId,
                ...(query.status !== undefined && { status: query.status }),
                ...this.createdAtFilter(query.from_date, query.to_date),
            },
            query,
        );
    }

    async findForStaff(query: FindStaffOrdersDto): Promise<OrderSummaryPage> {
        return await this.findSummaries(
            {
                market_id: query.market_id,
                ...(query.status !== undefined && { status: query.status }),
                ...(query.guest_only === true && { customer_id: null }),
                ...this.createdAtFilter(query.from_date, query.to_date),
            },
            query,
        );
    }

    async findOneForCustomer(
        customerId: string,
        orderId: string,
    ): Promise<CustomerOrderDetail | null> {
        return await this.prisma.order.findFirst({
            where: {
                id: orderId,
                customer_id: customerId,
            },
            select: customerOrderDetailSelect,
        });
    }

    async findOneForStaff(
        orderId: string,
        marketId: string,
    ): Promise<StaffOrderDetail | null> {
        return await this.prisma.order.findFirst({
            where: {
                id: orderId,
                market_id: marketId,
            },
            select: staffOrderDetailSelect,
        });
    }

    async transitionStatus(
        data: TransitionOrderStatusInput,
        tx?: Prisma.TransactionClient,
    ): Promise<TransitionOrderStatusResult> {
        const db: DbClient = tx ?? this.prisma;
        const updated = await db.order.updateMany({
            where: {
                id: data.order_id,
                ...(data.customer_id !== undefined && {
                    customer_id: data.customer_id,
                }),
                ...(data.market_id !== undefined && {
                    market_id: data.market_id,
                }),
                status: {
                    in: data.from_statuses,
                },
            },
            data: {
                status: data.to_status,
            },
        });

        if (updated.count > 0) {
            return {
                ok: true,
                order: {
                    id: data.order_id,
                    status: data.to_status,
                },
            };
        }

        const order = await db.order.findFirst({
            where: {
                id: data.order_id,
                ...(data.customer_id !== undefined && {
                    customer_id: data.customer_id,
                }),
                ...(data.market_id !== undefined && {
                    market_id: data.market_id,
                }),
            },
            select: { id: true, status: true },
        });

        if (!order) {
            return { ok: false, reason: 'not_found' };
        }

        return {
            ok: false,
            reason: 'invalid_transition',
            current_status: order.status,
        };
    }

    private async findSummaries(
        where: Prisma.OrderWhereInput,
        query: Pick<FindOrdersDto, 'cursor' | 'limit'>,
    ): Promise<OrderSummaryPage> {
        const limit = query.limit ?? 20;

        const records = await this.prisma.order.findMany({
            where,
            select: orderSummarySelect,
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
            items: page.map(toOrderSummary),
            next_cursor: hasMore ? page[page.length - 1].id : null,
        };
    }

    private createdAtFilter(
        fromDate?: string,
        toDate?: string,
    ): Pick<Prisma.OrderWhereInput, 'created_at'> {
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

    private async create(
        data: CreateOrderBase,
        status?: OrderStatus,
        tx?: Prisma.TransactionClient,
    ): Promise<Order> {
        const db: DbClient = tx ?? this.prisma;
        const promotionUsageIds = data.items
            .map((item) => item.promotion_usage_id)
            .filter((id): id is string => id !== undefined);

        return await db.order.create({
            data: {
                order_number: this.generateOrderNumber(),
                idempotency_key: data.idempotency_key,
                ...(status !== undefined && { status }),
                currency: data.currency,
                subtotal: data.subtotal,
                shipping_fee: data.shipping_fee,
                discount_amount: data.discount_amount,
                points_discount: data.points_discount,
                coupon_discount: data.coupon_discount,
                total_amount: data.total_amount,
                shipping_address: data.shipping_address as Prisma.InputJsonValue,
                billing_address: data.billing_address as Prisma.InputJsonValue,
                guest_email: data.guest_email,
                guest_name: data.guest_name,
                guest_phone_number: data.guest_phone_number,
                market: {
                    connect: { id: data.market_id },
                },
                warehouse: {
                    connect: { id: data.warehouse_id },
                },
                ...(data.customer_id
                    ? {
                          customer: {
                              connect: { id: data.customer_id },
                          },
                      }
                    : {}),
                ...(data.coupon_usage_id
                    ? {
                          coupon_usages: {
                              connect: { id: data.coupon_usage_id },
                          },
                      }
                    : {}),
                ...(promotionUsageIds.length > 0
                    ? {
                          promotion_usages: {
                              connect: promotionUsageIds.map((id) => ({ id })),
                          },
                      }
                    : {}),
                order_items: {
                    create: data.items.map((item) => this.toLineItem(item)),
                },
            },
        });
    }

    private guestAddressSnapshot(
        address: Omit<GuestAddressSnapshot, 'market_id'>,
        marketId: string,
    ): GuestAddressSnapshot {
        return {
            name: address.name,
            email: address.email,
            phone_number: address.phone_number,
            country: address.country,
            state: address.state,
            market_id: marketId,
            street_address: address.street_address,
        };
    }

    private toLineItem(item: CreateOrderItemInput) {
        return {
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            discount_type: item.discount_type,
            discount_value: item.discount_value,
            max_discount_amount: item.max_discount_amount,
            discount_amount: item.discount_amount,
            promotion_market_id: item.promotion_market_id,
            product_name: item.product_name,
            product_image: item.product_image,
            product_specs: item.product_specs as Prisma.InputJsonValue,
            market_variant: {
                connect: { id: item.market_variant_id },
            },
        };
    }

    private generateOrderNumber(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const suffix = randomBytes(3).toString('hex').toUpperCase();
        return `DK-${timestamp}-${suffix}`;
    }
}
