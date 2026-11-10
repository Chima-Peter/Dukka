import { IsDateString, IsObject, IsOptional } from 'class-validator';

export class AcknowledgeShipmentDto {
    @IsOptional()
    @IsDateString()
    occurred_at?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
