import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class RetryRefundWithCustomerDetailsDto {
    @IsUUID()
    market_id!: string;

    @IsString()
    @MinLength(5)
    @MaxLength(20)
    @Matches(/^\d+$/, {
        message: 'account_number must contain only digits',
    })
    account_number!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(16)
    bank_id!: string;
}
