import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@app/common';

@Module({
  imports: [ConfigModule, PrismaModule, AuthenticationModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
