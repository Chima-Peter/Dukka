import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class UpdateGuestCartItemQuantityDto {
    @IsUUID()
    cart_id!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;
}
