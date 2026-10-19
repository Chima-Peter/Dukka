import {
    ArrayMinSize,
    IsArray,
    IsEmail,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class InviteStaffDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsEmail()
    email!: string;

    @IsUUID()
    role_id!: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    market_ids!: string[];

    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone_number?: string;
}
