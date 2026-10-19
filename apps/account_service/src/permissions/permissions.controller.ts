import { Controller, Get } from '@nestjs/common';
import {
    Auth,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
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
}
