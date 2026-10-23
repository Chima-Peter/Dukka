import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type Order } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindOrdersDto } from './dto/find-orders.dto.js';
import type { FindStaffOrdersDto } from './dto/find-staff-orders.dto.js';
import {
    orderSummarySelect,
    toOrderSummary,
} from './mappers/order.mapper.js';
import type {
    CreateGuestOrderInput,
    CreateOrderBase,
    CreateOrderInput,
    CreateOrderItemInput,
    GuestAddressSnapshot,
} from './types/create-order.type.js';
import type { OrderSummaryPage } from './types/order.type.js';

@Injectable()
export class OrdersRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createForCustomer(
        customerId: string,
        data: CreateOrderInput,
    ): Promise<Order> {
        return await this.create({
            ...data,
            customer_id: customerId,
        });
    }

    async createForGuest(data: CreateGuestOrderInput): Promise<Order> {
        const sharedAddress = this.guestAddressSnapshot(data);

        return await this.create({
            currency: data.currency,
            subtotal: data.subtotal,
            shipping_fee: data.shipping_fee,
            discount_amount: data.discount_amount,
            points_discount: data.points_discount,
            coupon_discount: data.coupon_discount,
            total_amount: data.total_amount,
            market_id: data.market_id,
            warehouse_id: data.warehouse_id,
            items: data.items,
            shipping_address: sharedAddress,
            billing_address: sharedAddress,
            guest_email: data.guest_email,
            guest_name: data.guest_name,
            guest_phone_number: data.guest_phone_number,
        });
    }

    async findForCustomer(
        customerId: string,
        query: FindOrdersDto,
    ): Promise<OrderSummaryPage> {
        return await this.findSummaries({
            customer_id: customerId,
            ...(query.status !== undefined && { status: query.status }),
            ...this.createdAtFilter(query.from_date, query.to_date),
        }, query);
    }

    async findForStaff(query: FindStaffOrdersDto): Promise<OrderSummaryPage> {
        return await this.findSummaries({
            market_id: query.market_id,
            ...(query.status !== undefined && { status: query.status }),
            ...(query.guest_only === true && { customer_id: null }),
            ...this.createdAtFilter(query.from_date, query.to_date),
        }, query);
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

    private async create(data: CreateOrderBase): Promise<Order> {
        if (data.items.length === 0) {
            throw new BadRequestException('Order must include at least one item');
        }

        return await this.prisma.order.create({
            data: {
                order_number: this.generateOrderNumber(),
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
                order_tems: {
                    create: data.items.map((item) => this.toLineItem(item)),
                },
            },
        });
    }

    private guestAddressSnapshot(
        data: CreateGuestOrderInput,
    ): GuestAddressSnapshot {
        return {
            name: data.guest_name,
            email: data.guest_email,
            phone_number: data.guest_phone_number,
            country: data.country,
            state: data.state,
            market_id: data.market_id,
            street_address: data.street_address,
        };
    }

    private toLineItem(item: CreateOrderItemInput) {
        return {
            quantity: item.quantity,
            price: item.price,
            total: item.total,
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
