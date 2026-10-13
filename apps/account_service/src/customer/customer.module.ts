import { Module } from '@nestjs/common';
import { CustomerRepository } from './customer.repository.js';
import { CustomerService } from './customer.service.js';

@Module({
  providers: [CustomerService, CustomerRepository],
  exports: [CustomerService],
})
export class CustomerModule {}
