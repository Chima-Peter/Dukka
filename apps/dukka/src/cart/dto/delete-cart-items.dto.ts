import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class DeleteCartItemsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    item_ids!: string[];
}
