import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyAccountDeletionDto {
    @IsString()
    @IsNotEmpty()
    token!: string;
}
