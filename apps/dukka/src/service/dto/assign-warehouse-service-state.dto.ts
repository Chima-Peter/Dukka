import { IsUUID } from 'class-validator';

export class AssignWarehouseServiceStateDto {
    @IsUUID()
    warehouse_id!: string;
}
