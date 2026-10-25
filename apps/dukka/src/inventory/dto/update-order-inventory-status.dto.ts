import { IsEnum, IsIn } from 'class-validator';
import { OrderInventoryStatus } from '@app/common';

const TERMINAL_STATUSES = [
    OrderInventoryStatus.SUCCESS,
    OrderInventoryStatus.CLOSED,
] as const;

export class UpdateOrderInventoryStatusDto {
    @IsEnum(OrderInventoryStatus)
    @IsIn(TERMINAL_STATUSES)
    status!: (typeof TERMINAL_STATUSES)[number];
}
