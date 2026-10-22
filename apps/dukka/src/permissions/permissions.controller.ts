import {
    Controller,
    ForbiddenException,
    Get,
    Param,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    Auth,
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { PermissionsService } from './permissions.service.js';

@Auth('staff')
@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get()
    @RequirePermission(StaffPermission.PermissionsRead)
    @ResponseMessage('Permissions retrieved successfully')
    findAll() {
        return this.permissionsService.findAll();
    }

    @Get('staff/:staffId')
    @ResponseMessage('Staff permissions retrieved successfully')
    async getStaffPermissions(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @CurrentStaff() staff: StaffJwtPayload,
    ) {
        if (staff.sub !== staffId) {
            const callerPermissions =
                await this.permissionsService.getStaffPermissions(staff.sub);
            if (
                !callerPermissions.includes(StaffPermission.PermissionsRead)
            ) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        return this.permissionsService.getStaffPermissions(staffId);
    }
}
