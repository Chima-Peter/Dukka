import { IsEmail } from "class-validator";

export class InitiatePasswordResetDto {
  @IsEmail()
  email!: string;
}