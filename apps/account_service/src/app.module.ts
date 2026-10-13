import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@app/common';
import { AuthenticationModule } from './authentication/authentication.module.js';
import { ConfigModule } from './config/config.module.js';
import { CustomerModule } from './customer/customer.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, CustomerModule, AuthenticationModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
