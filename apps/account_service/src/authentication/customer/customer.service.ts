import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { successResponse, type ApiResponse } from '@app/common';
import { dehashPassword, hashPassword } from '@app/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Customer } from '../../../generated/prisma/client.js';
import { CustomerRepository } from './customer.repository.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import type { LoginCustomerDto } from './dto/login-customer.dto.js';

type PublicCustomer = Omit<Customer, 'password'>;

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(data: CreateCustomerDto): Promise<ApiResponse<PublicCustomer>> {
    try {
      const password = await hashPassword(data.password);
      const customer = await this.customerRepository.create({
        ...data,
        password,
      });
      const { password: _, ...publicCustomer } = customer;

      return successResponse(publicCustomer, 'Customer created successfully');
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

  async login(data: LoginCustomerDto): Promise<ApiResponse<PublicCustomer>> {
    try {
      const customer = await this.customerRepository.findByEmail(data.email);
      if (!customer) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isValid = await dehashPassword(data.password, customer.password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const { password: _, ...publicCustomer } = customer;
      return successResponse(publicCustomer, 'Login successful');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }
}
