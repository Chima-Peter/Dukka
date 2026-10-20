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
    RequirePermission,
    ResponseMessage,
    StaffPermission,
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
        @Body() data: CreateWarehouseDto,
        @Headers('authorization') authorization?: string,
    ) {
        return this.warehouseService.create(
            data,
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
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateWarehouseDto,
    ) {
        return this.warehouseService.update(id, data);
    }

    @Patch(':id/manager')
    @RequirePermission(StaffPermission.WarehousesUpdate)
    @ResponseMessage('Warehouse manager updated successfully')
    updateManager(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateWarehouseManagerDto,
    ) {
        return this.warehouseService.updateManager(id, data);
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.WarehousesClose)
    @ResponseMessage('Warehouse closed successfully')
    close(@Param('id', ParseUUIDPipe) id: string) {
        return this.warehouseService.close(id);
    }
}
