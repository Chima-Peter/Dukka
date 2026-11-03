import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateWarehouseDto {
    @IsUUID()
    market_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name!: string;

    @IsUUID()
    manager_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    address!: string;
}
