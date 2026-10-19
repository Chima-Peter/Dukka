import { readFileSync } from 'node:fs';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { STAFF_JWT_SERVICE, STAFF_PERMISSIONS_SERVICE } from '@app/common';
import type { ConfigType } from '../config/env.interface.js';
import { StaffPermissionsCacheService } from './staff-permissions-cache.service.js';

@Global()
@Module({
    imports: [
        JwtModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                const publicKey = readFileSync(
                    configService.getOrThrow('JWT_PUBLIC_KEY_PATH', {
                        infer: true,
                    }),
                    'utf8',
                );

                return {
                    publicKey,
                    verifyOptions: {
                        algorithms: ['RS256'],
                    },
                };
            },
        }),
    ],
    providers: [
        StaffPermissionsCacheService,
        {
            provide: STAFF_PERMISSIONS_SERVICE,
            useExisting: StaffPermissionsCacheService,
        },
        {
            provide: STAFF_JWT_SERVICE,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<ConfigType, true>) => {
                const publicKey = readFileSync(
                    configService.getOrThrow('STAFF_JWT_PUBLIC_KEY_PATH', {
                        infer: true,
                    }),
                    'utf8',
                );

                return new JwtService({
                    publicKey,
                    verifyOptions: {
                        algorithms: ['RS256'],
                    },
                });
            },
        },
    ],
    exports: [
        JwtModule,
        STAFF_JWT_SERVICE,
        STAFF_PERMISSIONS_SERVICE,
        StaffPermissionsCacheService,
    ],
})
export class AuthModule {}
