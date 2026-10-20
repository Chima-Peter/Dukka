import { IsUUID } from 'class-validator';

export class UpdateWarehouseManagerDto {
    @IsUUID()
    manager_id!: string;
}
