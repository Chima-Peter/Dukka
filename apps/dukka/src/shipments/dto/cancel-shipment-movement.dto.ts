import { IsDateString, IsObject, IsOptional } from 'class-validator';

export class CancelShipmentMovementDto {
    @IsOptional()
    @IsDateString()
    occurred_at?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
