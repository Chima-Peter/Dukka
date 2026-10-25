import { Injectable } from '@nestjs/common';
import { type ShippingAddress, PrismaService } from '@app/common';
import type { CreateShippingAddressDto } from './dto/create-shipping-address.dto.js';
import type { UpdateShippingAddressDto } from './dto/update-shipping-address.dto.js';

@Injectable()
export class ShippingAddressRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        customer_id: string,
        market_id: string,
        data: CreateShippingAddressDto,
    ): Promise<ShippingAddress> {
        return await this.prisma.shippingAddress.create({
            data: {
                ...data,
                market_id,
                customer_id,
            },
        });
    }

    async findAllByCustomerId(customer_id: string): Promise<ShippingAddress[]> {
        return await this.prisma.shippingAddress.findMany({
            where: { customer_id },
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<ShippingAddress | null> {
        return await this.prisma.shippingAddress.findUnique({
            where: { id },
        });
    }

    async findByIdAndCustomerId(
        id: string,
        customer_id: string,
    ): Promise<ShippingAddress | null> {
        return await this.prisma.shippingAddress.findFirst({
            where: { id, customer_id },
        });
    }

    async update(
        id: string,
        data: UpdateShippingAddressDto,
    ): Promise<ShippingAddress> {
        return await this.prisma.shippingAddress.update({
            where: { id },
            data: {
                ...(data.first_name !== undefined && {
                    first_name: data.first_name,
                }),
                ...(data.last_name !== undefined && {
                    last_name: data.last_name,
                }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.phone_number !== undefined && {
                    phone_number: data.phone_number,
                }),
                ...(data.whatsapp_number !== undefined && {
                    whatsapp_number: data.whatsapp_number,
                }),
                ...(data.country !== undefined && { country: data.country }),
                ...(data.state !== undefined && { state: data.state }),
                ...(data.street_address !== undefined && {
                    street_address: data.street_address,
                }),
            },
        });
    }

    async delete(id: string): Promise<ShippingAddress> {
        return await this.prisma.shippingAddress.delete({ where: { id } });
    }
}
