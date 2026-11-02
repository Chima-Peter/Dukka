import { Injectable } from '@nestjs/common';
import { type ShippingAddress, PrismaService } from '@app/common';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class ShippingAddressRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        customer_id: string | null,
        market_id: string,
        data: CreateAddressDto,
    ): Promise<ShippingAddress> {
        const { market_id: _ignored, ...addressFields } = data;
        return await this.prisma.shippingAddress.create({
            data: {
                ...addressFields,
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

    async findByIdAndEmail(
        id: string,
        email: string,
    ): Promise<ShippingAddress | null> {
        return await this.prisma.shippingAddress.findFirst({
            where: { id, email, customer_id: null },
        });
    }

    async update(
        id: string,
        data: UpdateAddressDto,
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
