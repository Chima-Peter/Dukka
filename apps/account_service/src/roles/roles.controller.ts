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
import { ResponseMessage } from '@app/common';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Post()
    @ResponseMessage('Role created successfully')
    create(@Body() data: CreateRoleDto) {
        return this.rolesService.create(data);
    }

    @Get()
    @ResponseMessage('Roles retrieved successfully')
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @ResponseMessage('Role retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    @ResponseMessage('Role updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateRoleDto,
    ) {
        return this.rolesService.update(id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Role deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.rolesService.delete(id);
    }

    @Get(':id/permissions/:permissionName/check')
    @ResponseMessage('Role permission check completed')
    hasPermission(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('permissionName') permissionName: string,
    ) {
        return this.rolesService.hasPermission(id, permissionName);
    }

    @Post(':id/permissions')
    @ResponseMessage('Permission assigned to role successfully')
    assignPermission(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('staff_id', ParseUUIDPipe) staff_id: string,
        @Body() data: AssignPermissionDto,
    ) {
        return this.rolesService.assignPermission(id, data, staff_id);
    }

    @Delete(':id/permissions/:permissionId')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Permission removed from role successfully')
    removePermission(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('permissionId', ParseUUIDPipe) permissionId: string,
        @Query('staff_id', ParseUUIDPipe) staff_id: string,
    ) {
        return this.rolesService.removePermission(id, permissionId, staff_id);
    }
}
