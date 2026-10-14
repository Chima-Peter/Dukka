import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Customer } from '../../generated/prisma/client.js';
import { CustomerRepository } from './customer.repository.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { UpdateCustomerDTO } from './dto/update-customer.dto.js';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async create(data: CreateCustomerDto): Promise<Customer> {
    try {
      this.logger.log(`Creating customer ${data.email}`);
      const customer = await this.customerRepository.create(data);
      this.logger.log(`Customer created ${customer.email}`);
      return customer;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(`Conflict error: ${error.message}`);
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target : [target];
        throw new ConflictException('This email is already in use!');
        
      }

      this.logger.error(`Internal server error: ${error}`);
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

  async findByID(id: string): Promise<Customer | null> {
    try {
      return await this.customerRepository.findByID(id);
    } catch {
      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }

  async updatePassword(email: string, password: string): Promise<Customer> {
    try {
      const customer = await this.customerRepository.updatePassword(email, password);
      return customer;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Customer not found');
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }

  async changePassword(
    customer_id: string,
    current_password: string,
    new_password: string,
  ) {
    try {
      this.logger.log('Changing user password');

      const customer = await this.findByID(customer_id);
      if (!customer) {
        throw new NotFoundException('Invalid user');
      }

      const isValid = await this.passwordHasher.verify(
        current_password,
        customer.password,
      );
      if (!isValid) {
        throw new UnauthorizedException('Invalid password');
      }

      this.logger.log('Saving new password');
      const hashedPassword = await this.passwordHasher.hash(new_password);
      await this.updatePassword(customer.email, hashedPassword);

      this.logger.log('User password updated');

      const { password: _, ...data } = customer;

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.warn(`HTTP exception: ${error.message}`);
        throw error;
      }
      this.logger.error(`Internal server error: ${error}`);
      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }

  async updateCustomerDetails(customer_id: string, dto: UpdateCustomerDTO) {
    try {
      this.logger.log(`Updating customer details for ${customer_id}`);

      const customer = await this.customerRepository.updateCustomer(
        customer_id,
        dto,
      );

      this.logger.log(`Customer details updated for ${customer_id}`);

      const { password: _, ...data } = customer;
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.warn(`HTTP exception: ${error.message}`);
        throw error;
      }
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Customer not found');
      }
      this.logger.error(`Internal server error: ${error}`);
      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }
}
