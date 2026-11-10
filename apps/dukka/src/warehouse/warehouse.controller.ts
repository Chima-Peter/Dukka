import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
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
import { AssignWarehouseStaffDto } from './dto/assign-warehouse-staff.dto.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { FindWarehousesDto } from './dto/find-warehouses.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { UpdateWarehouseManagerDto } from './dto/update-warehouse-manager.dto.js';
import { WarehouseService } from './warehouse.service.js';

@Auth('staff')
@Controller('warehouses')
export class WarehouseController {
    constructor(private readonly warehouseService: WarehouseService) {}

    @Post()
    @RequirePermission(StaffPermission.WarehousesCreate)
    @ResponseMessage('Warehouse created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateWarehouseDto,
    ) {
        return this.warehouseService.create(
            data,
            toScopedAccessActor(staff),
            {
                id: staff.sub,
                name: staff.name,
            },
        );
    }

    @Get()
    @ResponseMessage('Warehouses retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindWarehousesDto,
    ) {
        return this.warehouseService.findAll(
            query,
            toScopedAccessActor(staff),
        );
    }

    @Get(':id')
    @ResponseMessage('Warehouse retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.warehouseService.findOne(id, toScopedAccessActor(staff));
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.WarehousesManage)
    @ResponseMessage('Warehouse updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateWarehouseDto,
    ) {
        return this.warehouseService.update(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Patch(':id/manager')
    @RequirePermission(StaffPermission.WarehousesManage)
    @ResponseMessage('Warehouse manager updated successfully')
    updateManager(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateWarehouseManagerDto,
    ) {
        return this.warehouseService.updateManager(
            id,
            data,
            toScopedAccessActor(staff),
            {
                id: staff.sub,
                name: staff.name,
            },
        );
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.WarehousesManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Warehouse closed successfully')
    close(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.warehouseService.close(id, toScopedAccessActor(staff));
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.WarehousesManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Warehouse opened successfully')
    open(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.warehouseService.open(id, toScopedAccessActor(staff));
    }

    @Post(':id/staff')
    @RequirePermission(StaffPermission.WarehousesManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff assigned to warehouse successfully')
    assignStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AssignWarehouseStaffDto,
    ) {
        return this.warehouseService.assignStaff(
            id,
            data,
            toScopedAccessActor(staff),
            {
                id: staff.sub,
                name: staff.name,
            },
        );
    }
}
