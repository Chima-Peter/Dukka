import { Module } from '@nestjs/common';
import { CustomerModule } from './customer/customer.module.js';

@Module({
  imports: [CustomerModule],
})
export class AuthenticationModule {}
