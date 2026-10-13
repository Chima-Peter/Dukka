import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Customer } from '../../generated/prisma/client.js';
import { CustomerRepository } from './customer.repository.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(data: CreateCustomerDto): Promise<Customer> {
    try {
      return await this.customerRepository.create(data);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target : [target];
        if (fields.includes('email')) {
          throw new ConflictException('This email is already in use!');
        }
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }

  async findByEmail(email: string): Promise<Customer | null> {
    try {
      return await this.customerRepository.findByEmail(email);
    } catch {
      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }
}
