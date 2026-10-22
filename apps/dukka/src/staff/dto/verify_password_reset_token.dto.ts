import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyStaffPasswordResetTokenDto {
    @IsString()
    @IsNotEmpty()
    token!: string;

    @IsEmail()
    email!: string;
}
