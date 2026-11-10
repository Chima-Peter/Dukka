import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { PaystackService } from './paystack.service.js';

@Module({
    imports: [
        HttpClientModule.register({
            timeout: 15000,
        }),
    ],
    providers: [PaystackService],
    exports: [PaystackService],
})
export class PaystackModule {}
