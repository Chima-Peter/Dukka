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
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { FindRolesDto } from './dto/find-roles.dto.js';
import { RemovePermissionDto } from './dto/remove-permission.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

@Auth('staff')
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Post()
    @RequirePermission(StaffPermission.RolesManage)
    @ResponseMessage('Role created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateRoleDto,
    ) {
        return this.rolesService.create(data, staff.sub);
    }

    @Get()
    @RequirePermission(StaffPermission.RolesRead)
    @ResponseMessage('Roles retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindRolesDto,
    ) {
        return this.rolesService.findAll(
            staff.hierarchy,
            staff.scope_type,
            query.scope_type,
        );
    }

    @Get(':id')
    @RequirePermission(StaffPermission.RolesRead)
    @ResponseMessage('Role retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.rolesService.findOne(
            id,
            staff.hierarchy,
            staff.scope_type,
        );
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.RolesManage)
    @ResponseMessage('Role updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: UpdateRoleDto,
    ) {
        return this.rolesService.update(id, data, staff.sub);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.RolesManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Role deleted successfully')
    delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
    ) {
        return this.rolesService.delete(id, staff.sub);
    }

    @Get(':id/permissions/:permissionName/check')
    @RequirePermission(StaffPermission.RolesRead)
    @ResponseMessage('Role permission check completed')
    hasPermission(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('permissionName') permissionName: string,
    ) {
        return this.rolesService.hasPermission(id, permissionName);
    }

    @Post(':id/permissions')
    @RequirePermission(StaffPermission.RolesManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Permissions assigned to role successfully')
    assignPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: AssignPermissionDto,
    ) {
        return this.rolesService.assignPermissions(id, data, staff.sub);
    }

    @Delete(':id/permissions')
    @RequirePermission(StaffPermission.RolesManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Permissions removed from role successfully')
    removePermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: RemovePermissionDto,
    ) {
        return this.rolesService.removePermissions(id, data, staff.sub);
    }
}
