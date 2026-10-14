import { readFileSync } from 'node:fs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { ConfigType } from '../config/env.interface.js';
import { PasswordHasher } from '../shared/index.js';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerController } from './customer.controller.js';
import { CustomerRepository } from './customer.repository.js';
import { CustomerService } from './customer.service.js';
import { TokenRepository } from './token.repository.js';

@Module({
    imports: [
        JwtModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                const privateKeyPath = configService.getOrThrow(
                    'JWT_PRIVATE_KEY_PATH',
                    {
                        infer: true,
                    },
                );
                const publicKeyPath = configService.getOrThrow(
                    'JWT_PUBLIC_KEY_PATH',
                    {
                        infer: true,
                    },
                );
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
    controllers: [CustomerAuthController, CustomerController],
    providers: [
        CustomerService,
        CustomerRepository,
        CustomerAuthService,
        PasswordHasher,
        TokenRepository,
    ],
    exports: [CustomerService, JwtModule],
})
export class CustomerModule {}
