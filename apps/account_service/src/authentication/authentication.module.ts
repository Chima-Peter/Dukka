import { readFileSync } from 'node:fs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CustomerModule } from '../customer/customer.module.js';
import type { ConfigType } from '../config/env.interface.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    CustomerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigType, true>) => {
        const privateKeyPath = configService.getOrThrow('JWT_PRIVATE_KEY_PATH', {
          infer: true,
        });
        const privateKey = readFileSync(privateKeyPath, 'utf8');

        return {
          privateKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthenticationModule {}
