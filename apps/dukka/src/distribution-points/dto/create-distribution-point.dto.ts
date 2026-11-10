import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDistributionPointDto {
    @IsUUID()
    market_id!: string;

    @IsUUID()
    state_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    address!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(256)
    city!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(32)
    zip!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(32)
    contact_phone!: string;
}
