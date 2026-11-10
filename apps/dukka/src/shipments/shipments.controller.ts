import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import {
    Auth,
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { toScopedAccessActor } from '../shared/access-control.js';
import { MoveShipmentDto } from './dto/move-shipment.dto.js';
import { ShipmentsService } from './shipments.service.js';

@Auth('staff')
@Controller('shipments')
export class ShipmentsController {
    constructor(private readonly shipmentsService: ShipmentsService) {}

    @Post(':id/move')
    @RequirePermission(StaffPermission.ShipmentsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Shipment moved successfully')
    move(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: MoveShipmentDto,
    ) {
        return this.shipmentsService.move(
            id,
            data,
            toScopedAccessActor(staff),
            staff.sub,
        );
    }
}
