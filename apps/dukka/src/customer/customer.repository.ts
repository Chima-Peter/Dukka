import { Injectable } from '@nestjs/common';
import type { Customer } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import type { UpdateCustomerDTO } from './dto/update-customer.dto.js';

@Injectable()
export class CustomerRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCustomerDto): Promise<Customer> {
        return await this.prisma.customer.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password,
                cart: {
                    create: {},
                },
            },
        });
    }

    async findByEmail(email: string): Promise<Customer | null> {
        return await this.prisma.customer.findUnique({ where: { email } });
    }

    async findByID(customer_id: string): Promise<Customer | null> {
        return await this.prisma.customer.findUnique({
            where: { id: customer_id },
        });
    }

    async getCustomer(customer_id: string) {
        return await this.prisma.customer.findUnique({
            where: { id: customer_id },
            include: {
                shipping_address: {
                    orderBy: { created_at: 'desc' },
                    select: {
                      email: true,
                      first_name: true,
                      id: true,
                      last_name: true,
                      phone_number: true,
                      country: true,
                      state: true,
                      market_id: true,
                      street_address: true,
                      whatsapp_number: true,
                      created_at: true,
                      updated_at: true
                    }
                },
                points: {
                  select: {
                    balance: true
                  }
                }
            },
        });
    }

    async updatePassword(email: string, password: string): Promise<Customer> {
        return await this.prisma.customer.update({
            where: { email },
            data: { password },
        });
    }

    async updateCustomer(
        customer_id: string,
        dto: UpdateCustomerDTO,
    ): Promise<Customer> {
        return await this.prisma.customer.update({
            where: { id: customer_id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.phone_number !== undefined && {
                    phone_number: dto.phone_number,
                }),
                ...(dto.avatar_path !== undefined && {
                    avatar: dto.avatar_path,
                }),
                ...(dto.date_of_birth !== undefined && {
                    date_of_birth: new Date(dto.date_of_birth),
                }),
            },
        });
    }

    async updateActiveMarketId(
        customerId: string,
        marketId: string,
    ): Promise<Customer> {
        return await this.prisma.customer.update({
            where: { id: customerId },
            data: {
                active_market: {
                    connect: { id: marketId },
                },
            },
        });
    }

    async delete(customer_id: string): Promise<Customer> {
        return await this.prisma.customer.delete({
            where: { id: customer_id },
        });
    }
}
