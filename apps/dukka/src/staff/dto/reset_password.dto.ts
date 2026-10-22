import { IsEmail, IsStrongPassword, MaxLength } from 'class-validator';

export class ResetStaffPasswordDto {
    @IsEmail()
    email!: string;

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
