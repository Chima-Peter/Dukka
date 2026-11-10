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
import { AssignDistributionPointStaffDto } from './dto/assign-distribution-point-staff.dto.js';
import { CreateDistributionPointDto } from './dto/create-distribution-point.dto.js';
import { FindDistributionPointsDto } from './dto/find-distribution-points.dto.js';
import { UpdateDistributionPointDto } from './dto/update-distribution-point.dto.js';
import { DistributionPointsService } from './distribution-points.service.js';

@Auth('staff')
@Controller('distribution-points')
export class DistributionPointsController {
    constructor(
        private readonly distributionPointsService: DistributionPointsService,
    ) {}

    @Post()
    @RequirePermission(StaffPermission.DistributionPointsCreate)
    @ResponseMessage('Distribution point created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateDistributionPointDto,
    ) {
        return this.distributionPointsService.create(
            data,
            toScopedAccessActor(staff),
        );
    }

    @Get()
    @ResponseMessage('Distribution points retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindDistributionPointsDto,
    ) {
        return this.distributionPointsService.findAll(
            query,
            toScopedAccessActor(staff),
        );
    }

    @Get(':id')
    @ResponseMessage('Distribution point retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.distributionPointsService.findOne(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Get(':id/staff')
    @ResponseMessage('Distribution point staff retrieved successfully')
    findStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.distributionPointsService.findStaff(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.DistributionPointsManage)
    @ResponseMessage('Distribution point updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateDistributionPointDto,
    ) {
        return this.distributionPointsService.update(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.DistributionPointsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Distribution point closed successfully')
    close(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.distributionPointsService.close(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.DistributionPointsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Distribution point opened successfully')
    open(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.distributionPointsService.open(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/staff')
    @RequirePermission(StaffPermission.DistributionPointsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff assigned to distribution point successfully')
    assignStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AssignDistributionPointStaffDto,
    ) {
        return this.distributionPointsService.assignStaff(
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
