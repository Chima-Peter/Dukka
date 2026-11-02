import { IsEnum } from 'class-validator';


enum PaymentMethodType {
    CASH = 'CASH',
    PAYSTACK = 'PAYSTACK',
}

export class CreatePaymentMethodDto {
    @IsEnum(PaymentMethodType)
    name!: PaymentMethodType;
}
