import { IsEmail, IsStrongPassword, MaxLength } from 'class-validator';

export class ResetPasswordDTO {
    @IsEmail()
    email!: string;

    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    @MaxLength(128)
    password!: string;
}
