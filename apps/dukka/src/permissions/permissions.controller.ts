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
    staffHasRequiredPermission,
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
    findAll(@CurrentStaff() staff: StaffJwtPayload) {
        return this.permissionsService.findAll(staff.scope_type);
    }

    @Get('staff/:staffId')
    @ResponseMessage('Staff permissions retrieved successfully')
    async getStaffPermissions(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @CurrentStaff() staff: StaffJwtPayload,
    ) {
        if (staff.sub === staffId) {
            return this.permissionsService.getStaffPermissions(staffId);
        }

        if (
            !staffHasRequiredPermission(StaffPermission.PermissionsRead, staff)
        ) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return this.permissionsService.getStaffPermissionsInScope(staffId, {
            scopes: staff.scopes,
            market_ids: staff.market_ids,
            hierarchy: staff.hierarchy,
        });
    }
}
