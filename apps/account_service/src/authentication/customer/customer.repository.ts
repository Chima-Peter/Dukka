import { Injectable } from '@nestjs/common';
import type { Customer } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCustomerDto): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }
}
