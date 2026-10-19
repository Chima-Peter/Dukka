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
import {
    Auth,
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { AssignMarketDto } from './dto/assign-market.dto.js';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RemoveMarketDto } from './dto/remove-market.dto.js';
import { RemovePermissionDto } from './dto/remove-permission.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

@Auth('staff')
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Post()
    @RequirePermission(StaffPermission.RolesCreate)
    @ResponseMessage('Role created successfully')
    create(@Body() data: CreateRoleDto) {
        return this.rolesService.create(data);
    }

    @Get()
    @RequirePermission(StaffPermission.RolesRead)
    @ResponseMessage('Roles retrieved successfully')
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @RequirePermission(StaffPermission.RolesRead)
    @ResponseMessage('Role retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.RolesUpdate)
    @ResponseMessage('Role updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateRoleDto,
    ) {
        return this.rolesService.update(id, data);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.RolesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Role deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.rolesService.delete(id);
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
    @RequirePermission(StaffPermission.RolesAssignPermissions)
    @ResponseMessage('Permissions assigned to role successfully')
    assignPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: AssignPermissionDto,
    ) {
        return this.rolesService.assignPermissions(id, data, staff.sub);
    }

    @Delete(':id/permissions')
    @RequirePermission(StaffPermission.RolesRemovePermissions)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Permissions removed from role successfully')
    removePermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: RemovePermissionDto,
    ) {
        return this.rolesService.removePermissions(id, data, staff.sub);
    }

    @Post(':id/markets')
    @RequirePermission(StaffPermission.RolesAssignMarkets)
    @ResponseMessage('Markets assigned to role successfully')
    assignMarkets(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: AssignMarketDto,
    ) {
        return this.rolesService.assignMarkets(id, data, staff.sub);
    }

    @Delete(':id/markets')
    @RequirePermission(StaffPermission.RolesRemoveMarkets)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Markets removed from role successfully')
    removeMarkets(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: RemoveMarketDto,
    ) {
        return this.rolesService.removeMarkets(id, data, staff.sub);
    }
}
