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
}
