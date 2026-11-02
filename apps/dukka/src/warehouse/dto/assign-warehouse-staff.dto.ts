import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AssignWarehouseStaffDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    staff_ids!: string[];
}
