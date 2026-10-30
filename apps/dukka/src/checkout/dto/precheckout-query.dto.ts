import { IsOptional, IsUUID } from 'class-validator';

export class PrecheckoutQueryDto {
    @IsOptional()
    @IsUUID()
    cart_id?: string;
}
