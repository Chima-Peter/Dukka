import {
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type {
    Market,
    Permission,
    Role,
    RoleMarket,
    RolePermission,
} from '../../generated/prisma/client.js';
import type { AssignMarketDto } from './dto/assign-market.dto.js';
import type { AssignPermissionDto } from './dto/assign-permission.dto.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { RemoveMarketDto } from './dto/remove-market.dto.js';
import type { RemovePermissionDto } from './dto/remove-permission.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';
import { ACCESS_CONTROL_ERROR } from '../shared/access-control.js';
import {
    ROLES_REPO_ERROR,
    RolesRepository,
    type RoleWithDetails,
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

    async findAll(
        market_ids: string[],
        hierarchy: number | null,
    ): Promise<Role[]> {
        try {
            this.logger.log('Fetching roles');
            return await this.rolesRepository.findAll(market_ids, hierarchy);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        market_ids: string[],
        hierarchy: number | null,
    ): Promise<RoleWithDetails> {
        try {
            this.logger.log(`Fetching role ${id}`);
            const role = await this.rolesRepository.findById(id, {
                market_ids,
                hierarchy,
            });
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
        performed_by_staff_id: string,
    ): Promise<(RolePermission & { permission: Permission })[]> {
        try {
            this.logger.log(
                `Assigning ${data.permission_ids.length} permission(s) to role ${role_id}`,
            );
            const assignments = await this.rolesRepository.assignPermissions(
                role_id,
                data.permission_ids,
                performed_by_staff_id,
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
        performed_by_staff_id: string,
    ): Promise<object> {
        try {
            this.logger.log(
                `Removing ${data.permission_ids.length} permission(s) from role ${role_id}`,
            );
            const removed = await this.rolesRepository.removePermissions(
                role_id,
                data.permission_ids,
                performed_by_staff_id,
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

    async assignMarkets(
        role_id: string,
        data: AssignMarketDto,
        performed_by_staff_id: string,
    ): Promise<(RoleMarket & { market: Market })[]> {
        try {
            this.logger.log(
                `Assigning ${data.market_ids.length} market(s) to role ${role_id}`,
            );
            const assignments = await this.rolesRepository.assignMarkets(
                role_id,
                data.market_ids,
                performed_by_staff_id,
            );
            this.logger.log(
                `Assigned ${assignments.length} market(s) to role ${role_id}`,
            );
            return assignments;
        } catch (error) {
            this.handleMarketError(error);
        }
    }

    async removeMarkets(
        role_id: string,
        data: RemoveMarketDto,
        performed_by_staff_id: string,
    ): Promise<object> {
        try {
            this.logger.log(
                `Removing ${data.market_ids.length} market(s) from role ${role_id}`,
            );
            const removed = await this.rolesRepository.removeMarkets(
                role_id,
                data.market_ids,
                performed_by_staff_id,
            );
            if (removed === 0) {
                throw new NotFoundException(
                    'None of the markets are assigned to this role',
                );
            }
            this.logger.log(`Removed ${removed} market(s) from role ${role_id}`);
            return { data: null };
        } catch (error) {
            this.handleMarketError(error);
        }
    }

    async hasPermission(
        role_id: string,
        permission_name: string,
        market_ids: string[],
        hierarchy: number | null,
    ): Promise<{ has_permission: boolean }> {
        try {
            this.logger.log(
                `Checking permission ${permission_name} on role ${role_id}`,
            );

            const role = await this.rolesRepository.findById(role_id, {
                market_ids,
                hierarchy,
            });
            if (!role) {
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

    private mapRepoNotFound(error: Error): never | null {
        if (error.message === ROLES_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND) {
            throw new NotFoundException('Performing staff not found');
        }
        if (error.message === ROLES_REPO_ERROR.ROLE_NOT_FOUND) {
            throw new NotFoundException('Role not found');
        }
        if (error.message === ROLES_REPO_ERROR.PERMISSIONS_NOT_FOUND) {
            throw new NotFoundException('One or more permissions not found');
        }
        if (error.message === ROLES_REPO_ERROR.MARKETS_NOT_FOUND) {
            throw new NotFoundException('One or more markets not found');
        }
        if (error.message === ROLES_REPO_ERROR.SELF_ROLE_MODIFICATION) {
            throw new ForbiddenException(
                'Staff cannot modify permissions or markets on their own role',
            );
        }
        if (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_HIERARCHY) {
            throw new ForbiddenException(
                'Cannot modify a role with the same or higher hierarchy',
            );
        }
        if (
            error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS
        ) {
            throw new ForbiddenException(
                'Cannot assign or remove markets outside your markets',
            );
        }
        if (error.message === ACCESS_CONTROL_ERROR.MISSING_PERMISSION) {
            throw new ForbiddenException(
                'Cannot assign or remove a permission you do not have',
            );
        }
        return null;
    }

    private handlePermissionError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof Error) {
            this.mapRepoNotFound(error);
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

    private handleMarketError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof Error) {
            this.mapRepoNotFound(error);
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'Market is already assigned to this role',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(`Foreign key constraint: ${error.message}`);
                throw new NotFoundException('Role, market, or staff not found');
            }
            if (error.code === 'P2025') {
                throw new NotFoundException(
                    'Market is not assigned to this role',
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
                    'Role cannot be deleted while it is still assigned to staff or has permissions or markets linked',
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
