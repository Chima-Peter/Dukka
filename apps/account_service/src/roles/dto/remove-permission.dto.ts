import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class RemovePermissionDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    permission_ids!: string[];
}
