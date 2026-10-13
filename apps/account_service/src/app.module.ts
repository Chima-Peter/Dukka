import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuthenticationModule],
})
export class AppModule {}
