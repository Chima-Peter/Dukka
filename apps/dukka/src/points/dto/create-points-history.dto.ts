import { IsEnum, IsInt, Min } from 'class-validator';
import { POINT_REASON } from '@app/common';

export class CreatePointsHistoryDto {
    @IsEnum(POINT_REASON)
    description!: POINT_REASON;

    @IsInt()
    @Min(1)
    count!: number;
}
