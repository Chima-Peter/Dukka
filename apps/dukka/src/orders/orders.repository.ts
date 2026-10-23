import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type Order } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
    CreateGuestOrderInput,
    CreateOrderInput,
    CreateOrderItemInput,
    GuestAddressSnapshot,
    OrderAddressSnapshot,
} from './types/create-order.type.js';

type CreateOrderBase = {
    currency: string;
    subtotal: number;
    shipping_fee: number;
    discount_amount: number;
    points_discount: number;
    coupon_discount: number;
    total_amount: number;
    shipping_address: OrderAddressSnapshot | GuestAddressSnapshot;
    billing_address: OrderAddressSnapshot | GuestAddressSnapshot;
    items: CreateOrderItemInput[];
    customer_id?: string;
    guest_email?: string;
    guest_name?: string;
    guest_phone_number?: string;
};

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
            items: data.items,
            shipping_address: sharedAddress,
            billing_address: sharedAddress,
            guest_email: data.guest_email,
            guest_name: data.guest_name,
            guest_phone_number: data.guest_phone_number,
        });
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
