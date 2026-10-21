import {
    Body,
    Controller,
    Get,
    Headers,
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
import { extractBearerToken } from '../shared/extract-bearer-token.js';
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
        @Headers('authorization') authorization?: string,
    ) {
        return this.warehouseService.create(
            data,
            staff.market_ids,
            extractBearerToken(authorization),
        );
    }

    @Get()
    @ResponseMessage('Warehouses retrieved successfully')
    findAll(@Query() query: FindWarehousesDto) {
        return this.warehouseService.findAll(query);
    }

    @Get(':id')
    @ResponseMessage('Warehouse retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.warehouseService.findOne(id);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.WarehousesUpdate)
    @ResponseMessage('Warehouse updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateWarehouseDto,
    ) {
        return this.warehouseService.update(id, data, staff.market_ids);
    }

    @Patch(':id/manager')
    @RequirePermission(StaffPermission.WarehousesUpdate)
    @ResponseMessage('Warehouse manager updated successfully')
    updateManager(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateWarehouseManagerDto,
        @Headers('authorization') authorization?: string,
    ) {
        return this.warehouseService.updateManager(
            id,
            data,
            staff.market_ids,
            extractBearerToken(authorization),
        );
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.WarehousesClose)
    @ResponseMessage('Warehouse closed successfully')
    close(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.warehouseService.close(id, staff.market_ids);
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.WarehousesOpen)
    @ResponseMessage('Warehouse opened successfully')
    open(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.warehouseService.open(id, staff.market_ids);
    }
}
