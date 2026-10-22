import {
    IsEmail,
    IsString,
    IsStrongPassword,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateCustomerDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @IsStrongPassword(
        {
            minLength: 12,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        },
        {
            message:
                'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol',
        },
    )
    @MaxLength(128)
    password!: string;
}
