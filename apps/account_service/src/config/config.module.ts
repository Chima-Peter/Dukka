import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation.js';

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            envFilePath: ['apps/account_service/.env', '.env'],
            validationSchema: envValidationSchema,
            validationOptions: {
                libraryOptions: {
                    abortEarly: true,
                },
            },
        }),
    ],
})
export class ConfigModule {}
