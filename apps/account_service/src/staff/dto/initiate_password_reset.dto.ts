import { IsEmail } from 'class-validator';

export class InitiateStaffPasswordResetDto {
    @IsEmail()
    email!: string;
}
