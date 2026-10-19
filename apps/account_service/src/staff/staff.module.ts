import { readFileSync } from 'node:fs';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { STAFF_JWT_SERVICE } from '@app/common';
import type { ConfigType } from '../config/env.interface.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { StaffAuthController } from './staff-auth.controller.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffController } from './staff.controller.js';
import { StaffRepository } from './staff.repository.js';
import { StaffService } from './staff.service.js';
import { StaffTokenRepository } from './token.repository.js';

@Global()
@Module({
    controllers: [StaffAuthController, StaffController],
    providers: [
        StaffService,
        StaffRepository,
        StaffAuthService,
        StaffTokenRepository,
        PasswordHasher,
        {
            provide: STAFF_JWT_SERVICE,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                const privateKeyPath = configService.getOrThrow(
                    'STAFF_JWT_PRIVATE_KEY_PATH',
                    { infer: true },
                );
                const publicKeyPath = configService.getOrThrow(
                    'STAFF_JWT_PUBLIC_KEY_PATH',
                    { infer: true },
                );
                const privateKey = readFileSync(privateKeyPath, 'utf8');
                const publicKey = readFileSync(publicKeyPath, 'utf8');

                return new JwtService({
                    privateKey,
                    publicKey,
                    signOptions: {
                        algorithm: 'RS256',
                        expiresIn: '7d',
                    },
                    verifyOptions: {
                        algorithms: ['RS256'],
                    },
                });
            },
        },
    ],
    exports: [StaffService, STAFF_JWT_SERVICE],
})
export class StaffModule {}
