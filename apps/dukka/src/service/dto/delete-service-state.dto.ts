import { IsUUID } from 'class-validator';

export class DeleteServiceStateDto {
    @IsUUID()
    country_id!: string;
}
