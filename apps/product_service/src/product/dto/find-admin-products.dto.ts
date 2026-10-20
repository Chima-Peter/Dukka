import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '../../../generated/prisma/client.js';
import { FindProductsDto } from './find-products.dto.js';

export class FindAdminProductsDto extends FindProductsDto {
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;
}
