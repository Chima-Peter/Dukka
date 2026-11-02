import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsUUID,
    Min,
    ValidateIf,
} from 'class-validator';

export class CheckoutDto {
    @IsOptional()
    @IsUUID()
    cart_id?: string;

    @IsUUID()
    shipping_address_id!: string;

    /** `null` means use the same address as shipping. */
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsUUID()
    billing_address_id?: string | null;

    @IsUUID()
    payment_method_id!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    points?: number;
}
