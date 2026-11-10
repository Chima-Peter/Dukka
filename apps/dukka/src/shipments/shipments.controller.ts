import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
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
import { AcknowledgeShipmentDto } from './dto/acknowledge-shipment.dto.js';
import { CancelShipmentMovementDto } from './dto/cancel-shipment-movement.dto.js';
import { FindShipmentsDto } from './dto/find-shipments.dto.js';
import { MoveShipmentDto } from './dto/move-shipment.dto.js';
import { ShipmentsService } from './shipments.service.js';

@Auth('staff')
@Controller('shipments')
export class ShipmentsController {
    constructor(private readonly shipmentsService: ShipmentsService) {}

    @Get()
    @RequirePermission(StaffPermission.ShipmentsRead)
    @ResponseMessage('Shipments retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindShipmentsDto,
    ) {
        return this.shipmentsService.findAll(
            query,
            toScopedAccessActor(staff),
        );
    }

    @Get(':id')
    @RequirePermission(StaffPermission.ShipmentsRead)
    @ResponseMessage('Shipment retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.shipmentsService.findOne(id, toScopedAccessActor(staff));
    }

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

    @Post(':id/acknowledge')
    @RequirePermission(StaffPermission.ShipmentsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Shipment receipt acknowledged successfully')
    acknowledge(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AcknowledgeShipmentDto,
    ) {
        return this.shipmentsService.acknowledge(
            id,
            data,
            toScopedAccessActor(staff),
            staff.sub,
        );
    }

    @Post(':id/cancel-movement')
    @RequirePermission(StaffPermission.ShipmentsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Shipment movement cancelled successfully')
    cancelMovement(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CancelShipmentMovementDto,
    ) {
        return this.shipmentsService.cancelMovement(
            id,
            data,
            toScopedAccessActor(staff),
            staff.sub,
        );
    }
}
