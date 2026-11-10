import {
    IsDateString,
    IsObject,
    IsOptional,
    IsUUID,
} from 'class-validator';

export class DeliverShipmentDto {
    @IsUUID()
    to_location_id!: string;

    @IsUUID()
    logistics_partner_id!: string;

    @IsDateString()
    expected_departure_date!: string;

    @IsDateString()
    expected_arrival_date!: string;

    @IsOptional()
    @IsDateString()
    occurred_at?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
