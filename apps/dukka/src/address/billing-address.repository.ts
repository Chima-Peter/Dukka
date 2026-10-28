import { Injectable } from '@nestjs/common';
import { type BillingAddress, PrismaService } from '@app/common';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class BillingAddressRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        customer_id: string,
        market_id: string,
        data: CreateAddressDto,
    ): Promise<BillingAddress> {
        return await this.prisma.billingAddress.create({
            data: {
                ...data,
                market_id,
                customer_id,
            },
        });
    }

    async findAllByCustomerId(customer_id: string): Promise<BillingAddress[]> {
        return await this.prisma.billingAddress.findMany({
            where: { customer_id },
            orderBy: { created_at: 'desc' },
        });
    }

    async findByIdAndCustomerId(
        id: string,
        customer_id: string,
    ): Promise<BillingAddress | null> {
        return await this.prisma.billingAddress.findFirst({
            where: { id, customer_id },
        });
    }

    async update(
        id: string,
        data: UpdateAddressDto,
    ): Promise<BillingAddress> {
        return await this.prisma.billingAddress.update({
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

    async delete(id: string): Promise<BillingAddress> {
        return await this.prisma.billingAddress.delete({ where: { id } });
    }
}
