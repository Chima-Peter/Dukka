import { Controller, Get } from '@nestjs/common';
import { ResponseMessage } from '@app/common';
import { PermissionsService } from './permissions.service.js';

@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get()
    @ResponseMessage('Permissions retrieved successfully')
    findAll() {
        return this.permissionsService.findAll();
    }
}
