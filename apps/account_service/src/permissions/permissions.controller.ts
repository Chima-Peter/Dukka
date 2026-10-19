import { Controller, Get } from '@nestjs/common';
import { Auth, ResponseMessage } from '@app/common';
import { PermissionsService } from './permissions.service.js';

@Auth('staff')
@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get()
    @ResponseMessage('Permissions retrieved successfully')
    findAll() {
        return this.permissionsService.findAll();
    }
}
