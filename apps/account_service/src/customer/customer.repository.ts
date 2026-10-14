import { Injectable } from '@nestjs/common';
import type { Customer } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCustomerDto): Promise<Customer> {
    return await this.prisma.customer.create({ data });
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return await this.prisma.customer.findUnique({ where: { email } });
  }

  async findByID(customer_id: string): Promise<Customer | null> {
    return await this.prisma.customer.findUnique({ where: { id: customer_id } });
  }

  async updatePassword(email: string, password: string): Promise<Customer> {
    return await this.prisma.customer.update({ where: { email }, data: { password } });
  }
}
