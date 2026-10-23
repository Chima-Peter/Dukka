import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateServiceStateDto {
    @IsUUID()
    country_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(256)
    state_name!: string;
}
