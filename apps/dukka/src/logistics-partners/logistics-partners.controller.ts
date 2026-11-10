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
import { CreateLogisticsPartnerDto } from './dto/create-logistics-partner.dto.js';
import { FindLogisticsPartnersDto } from './dto/find-logistics-partners.dto.js';
import { UpdateLogisticsPartnerDto } from './dto/update-logistics-partner.dto.js';
import { LogisticsPartnersService } from './logistics-partners.service.js';

@Auth('staff')
@Controller('logistics-partners')
export class LogisticsPartnersController {
    constructor(
        private readonly logisticsPartnersService: LogisticsPartnersService,
    ) {}

    @Post()
    @RequirePermission(StaffPermission.LogisticsPartnersCreate)
    @ResponseMessage('Logistics partner created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateLogisticsPartnerDto,
    ) {
        return this.logisticsPartnersService.create(
            data,
            toScopedAccessActor(staff),
        );
    }

    @Get()
    @RequirePermission(StaffPermission.LogisticsPartnersRead)
    @ResponseMessage('Logistics partners retrieved successfully')
    findAll(@Query() query: FindLogisticsPartnersDto) {
        return this.logisticsPartnersService.findAll(query);
    }

    @Get(':id')
    @RequirePermission(StaffPermission.LogisticsPartnersRead)
    @ResponseMessage('Logistics partner retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.logisticsPartnersService.findOne(id);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.LogisticsPartnersManage)
    @ResponseMessage('Logistics partner updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateLogisticsPartnerDto,
    ) {
        return this.logisticsPartnersService.update(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/activate')
    @RequirePermission(StaffPermission.LogisticsPartnersManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Logistics partner activated successfully')
    activate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.logisticsPartnersService.activate(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/deactivate')
    @RequirePermission(StaffPermission.LogisticsPartnersManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Logistics partner deactivated successfully')
    deactivate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.logisticsPartnersService.deactivate(
            id,
            toScopedAccessActor(staff),
        );
    }
}
