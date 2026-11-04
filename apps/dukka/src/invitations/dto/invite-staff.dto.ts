import {
    ArrayMinSize,
    IsArray,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';

const SCOPE_TYPES = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
] as const;

export class InviteStaffDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsEmail()
    email!: string;

    @IsUUID()
    role_id!: string;

    @IsIn(SCOPE_TYPES)
    scope_type!: (typeof SCOPE_TYPES)[number];

    @ValidateIf((dto: InviteStaffDto) => dto.scope_type === 'MARKET')
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    market_ids?: string[];

    @ValidateIf((dto: InviteStaffDto) => dto.scope_type === 'WAREHOUSE')
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    warehouse_ids?: string[];

    @ValidateIf(
        (dto: InviteStaffDto) => dto.scope_type === 'DISTRIBUTION_POINT',
    )
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    distribution_point_ids?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone_number?: string;
}
