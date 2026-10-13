import { readFileSync } from 'node:fs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticationModule as NestAuthenticationModule } from '@nestjs/authentication';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@app/common';
import type { ConfigType } from '../config/env.interface.js';
import { CustomerModule } from '../customer/customer.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    CustomerModule,
    NestAuthenticationModule.forRoot({
      globalGuard: false,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigType, true>) => {
        const privateKeyPath = configService.getOrThrow('JWT_PRIVATE_KEY_PATH', {
          infer: true,
        });
        const publicKeyPath = configService.getOrThrow('JWT_PUBLIC_KEY_PATH', {
          infer: true,
        });
        const privateKey = readFileSync(privateKeyPath, 'utf8');
        const publicKey = readFileSync(publicKeyPath, 'utf8');

        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '7d',
          },
          verifyOptions: {
            algorithms: ['RS256'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthenticationModule {}
