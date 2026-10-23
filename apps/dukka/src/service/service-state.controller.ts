import {
    Body,
    Controller,
    Delete,
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
    CurrentCustomer,
    CurrentStaff,
    OptionalCustomerAuth,
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { AssignWarehouseServiceStateDto } from './dto/assign-warehouse-service-state.dto.js';
import { CreateServiceStateDto } from './dto/create-service-state.dto.js';
import { DeleteServiceStateDto } from './dto/delete-service-state.dto.js';
import { FindServiceStatesDto } from './dto/find-service-states.dto.js';
import { FindStaffServiceStatesDto } from './dto/find-staff-service-states.dto.js';
import { UpdateServiceStateDto } from './dto/update-service-state.dto.js';
import { ServiceStateService } from './service-state.service.js';

@Auth('staff')
@Controller('service/states')
export class ServiceStateController {
    constructor(private readonly serviceStateService: ServiceStateService) {}

    @Post()
    @RequirePermission(StaffPermission.ServiceStatesCreate)
    @ResponseMessage('Service state created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateServiceStateDto,
    ) {
        return this.serviceStateService.create(data, staff.market_ids);
    }

    @Get()
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Service states retrieved successfully')
    findAll(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Query() query: FindServiceStatesDto,
    ) {
        return this.serviceStateService.findAll(customer?.sub, query);
    }

    @Get('staff')
    @ResponseMessage('Service states retrieved successfully')
    findAllForStaff(@Query() query: FindStaffServiceStatesDto) {
        return this.serviceStateService.findAllForStaff(query);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.ServiceStatesUpdate)
    @ResponseMessage('Service state updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateServiceStateDto,
    ) {
        return this.serviceStateService.update(id, data, staff.market_ids);
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.ServiceStatesOpen)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service state opened successfully')
    open(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.serviceStateService.open(id, staff.market_ids);
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.ServiceStatesClose)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service state closed successfully')
    close(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.serviceStateService.close(id, staff.market_ids);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.ServiceStatesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service state deleted successfully')
    delete(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: DeleteServiceStateDto,
    ) {
        return this.serviceStateService.delete(
            id,
            query.country_id,
            staff.market_ids,
        );
    }

    @Post(':id/warehouses')
    @RequirePermission(StaffPermission.ServiceStatesUpdate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Warehouse assigned to service state successfully')
    assignWarehouse(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AssignWarehouseServiceStateDto,
    ) {
        return this.serviceStateService.assignWarehouse(
            id,
            data,
            staff.market_ids,
        );
    }

    @Delete(':id/warehouses/:warehouseId')
    @RequirePermission(StaffPermission.ServiceStatesUpdate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Warehouse unassigned from service state successfully')
    unassignWarehouse(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    ) {
        return this.serviceStateService.unassignWarehouse(
            id,
            warehouseId,
            staff.market_ids,
        );
    }
}
