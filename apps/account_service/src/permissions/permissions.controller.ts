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
} from '@nestjs/common';
import { ResponseMessage } from '@app/common';
import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';
import { PermissionsService } from './permissions.service.js';

@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Post()
    @ResponseMessage('Permission created successfully')
    create(@Body() data: CreatePermissionDto) {
        return this.permissionsService.create(data);
    }

    @Get()
    @ResponseMessage('Permissions retrieved successfully')
    findAll() {
        return this.permissionsService.findAll();
    }

    @Get(':id')
    @ResponseMessage('Permission retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.permissionsService.findOne(id);
    }

    @Patch(':id')
    @ResponseMessage('Permission updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdatePermissionDto,
    ) {
        return this.permissionsService.update(id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Permission deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.permissionsService.delete(id);
    }
}
