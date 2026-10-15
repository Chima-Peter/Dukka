import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Permission, Role, RolePermission } from '../../generated/prisma/client.js';
import type { AssignPermissionDto } from './dto/assign-permission.dto.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { RemovePermissionDto } from './dto/remove-permission.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';
import {
    RolesRepository,
    type RoleWithPermissions,
} from './roles.repository.js';

@Injectable()
export class RolesService {
    private readonly logger = new Logger(RolesService.name);

    constructor(private readonly rolesRepository: RolesRepository) {}

    async create(data: CreateRoleDto): Promise<Role> {
        try {
            this.logger.log(`Creating role ${data.name}`);
            const role = await this.rolesRepository.create(data);
            this.logger.log(`Role created ${role.id}`);
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(): Promise<Role[]> {
        try {
            this.logger.log('Fetching roles');
            return await this.rolesRepository.findAll();
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<RoleWithPermissions> {
        try {
            this.logger.log(`Fetching role ${id}`);
            const role = await this.rolesRepository.findById(id);
            if (!role) {
                throw new NotFoundException('Role not found');
            }
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateRoleDto): Promise<Role> {
        try {
            this.logger.log(`Updating role ${id}`);
            const role = await this.rolesRepository.update(id, data);
            this.logger.log(`Role updated ${id}`);
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting role ${id}`);
            await this.rolesRepository.delete(id);
            this.logger.log(`Role deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    async assignPermissions(
        role_id: string,
        data: AssignPermissionDto,
        staff_id: string,
    ): Promise<(RolePermission & { permission: Permission })[]> {
        try {
            this.logger.log(
                `Assigning ${data.permission_ids.length} permission(s) to role ${role_id}`,
            );
            const assignments = await this.rolesRepository.assignPermissions(
                role_id,
                data.permission_ids,
                staff_id,
            );
            this.logger.log(
                `Assigned ${assignments.length} permission(s) to role ${role_id}`,
            );
            return assignments;
        } catch (error) {
            this.handlePermissionError(error);
        }
    }

    async removePermissions(
        role_id: string,
        data: RemovePermissionDto,
        staff_id: string,
    ): Promise<object> {
        try {
            this.logger.log(
                `Removing ${data.permission_ids.length} permission(s) from role ${role_id}`,
            );
            const removed = await this.rolesRepository.removePermissions(
                role_id,
                data.permission_ids,
                staff_id,
            );
            if (removed === 0) {
                throw new NotFoundException(
                    'None of the permissions are assigned to this role',
                );
            }
            this.logger.log(
                `Removed ${removed} permission(s) from role ${role_id}`,
            );
            return { data: null };
        } catch (error) {
            this.handlePermissionError(error);
        }
    }

    async hasPermission(
        role_id: string,
        permission_name: string,
    ): Promise<{ has_permission: boolean }> {
        try {
            this.logger.log(
                `Checking permission ${permission_name} on role ${role_id}`,
            );

            const roleExists = await this.rolesRepository.exists(role_id);
            if (!roleExists) {
                throw new NotFoundException('Role not found');
            }

            const has_permission = await this.rolesRepository.hasPermission(
                role_id,
                permission_name,
            );

            return { has_permission };
        } catch (error) {
            this.handleError(error);
        }
    }

    private handlePermissionError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'Permission is already assigned to this role',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(`Foreign key constraint: ${error.message}`);
                throw new NotFoundException(
                    'Role, permission, or staff not found',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException(
                    'Permission is not assigned to this role',
                );
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A role with this name already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on role delete: ${error.message}`,
                );
                throw new ConflictException(
                    'Role cannot be deleted while it is still assigned to staff or has permissions linked',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Role not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
