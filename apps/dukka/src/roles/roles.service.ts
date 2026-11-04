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
    Permission,
    Role,
    RolePermission,
    ScopeType,
} from '@app/common';
import { MAIL_TEMPLATES, MailQueueService } from '@app/queues';
import type { AssignPermissionDto } from './dto/assign-permission.dto.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { RemovePermissionDto } from './dto/remove-permission.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';
import { ACCESS_CONTROL_ERROR } from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import {
    ROLES_REPO_ERROR,
    RolesRepository,
    type RoleWithDetails,
} from './roles.repository.js';

@Injectable()
export class RolesService {
    private readonly logger = new Logger(RolesService.name);

    constructor(
        private readonly rolesRepository: RolesRepository,
        private readonly mailQueueService: MailQueueService,
    ) {}

    async create(
        data: CreateRoleDto,
        performed_by_staff_id: string,
    ): Promise<Role> {
        try {
            this.logger.log(`Creating role ${data.name}`);
            const role = await this.rolesRepository.create(
                data,
                performed_by_staff_id,
            );
            this.logger.log(`Role created ${role.id}`);
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(
        hierarchy: number | null,
        actor_scope_type: ScopeType | null,
        filter_scope_type?: ScopeType | null,
    ): Promise<Role[]> {
        try {
            this.logger.log('Fetching roles');
            const roles = await this.rolesRepository.findAll(
                hierarchy,
                actor_scope_type,
                filter_scope_type,
            );
            this.logger.log('Fetched roles');
            return roles;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        hierarchy: number | null,
        scope_type: ScopeType | null,
    ): Promise<RoleWithDetails> {
        try {
            this.logger.log(`Fetching role ${id}`);
            const role = await this.rolesRepository.findById(id, {
                hierarchy,
                scope_type,
            });
            if (!role) {
                throw new NotFoundException('Role not found');
            }
            this.logger.log(`Fetched role ${id}`);
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateRoleDto,
        performed_by_staff_id: string,
    ): Promise<Role> {
        try {
            this.logger.log(`Updating role ${id}`);
            const role = await this.rolesRepository.update(
                id,
                data,
                performed_by_staff_id,
            );
            this.logger.log(`Role updated ${id}`);

            await this.notifyRoleStaff(id, {
                subject: 'Your role was updated',
                template: MAIL_TEMPLATES.STAFF_ROLE_UPDATED,
                context: {
                    roleId: role.id,
                    roleName: role.name,
                    hierarchy: role.hierarchy,
                },
            });

            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(
        id: string,
        performed_by_staff_id: string,
    ): Promise<object> {
        try {
            this.logger.log(`Deleting role ${id}`);
            await this.rolesRepository.delete(id, performed_by_staff_id);
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

            await this.notifyRoleStaff(role_id, {
                subject: 'Your role permissions were updated',
                template: MAIL_TEMPLATES.STAFF_PERMISSIONS_CHANGED,
                context: {
                    roleId: role_id,
                    action: 'assigned',
                    permissionNames: assignments.map(
                        (assignment) => assignment.permission.name,
                    ),
                },
            });

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

            await this.notifyRoleStaff(role_id, {
                subject: 'Your role permissions were updated',
                template: MAIL_TEMPLATES.STAFF_PERMISSIONS_CHANGED,
                context: {
                    roleId: role_id,
                    action: 'removed',
                    permissionIds: data.permission_ids,
                },
            });

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

            const role = await this.rolesRepository.findById(role_id);
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

    private async notifyRoleStaff(
        role_id: string,
        mail: {
            subject: string;
            template: string;
            context: Record<string, unknown>;
        },
    ): Promise<void> {
        const contacts =
            await this.rolesRepository.findStaffContactsByRoleId(role_id);

        await this.mailQueueService.enqueueSendMany(
            contacts.map((contact) => ({
                to: contact.email,
                subject: mail.subject,
                template: mail.template,
                context: {
                    ...mail.context,
                    name: contact.name,
                    email: contact.email,
                },
            })),
        );
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
        if (error.message === ROLES_REPO_ERROR.PERMISSION_SCOPE_MISMATCH) {
            throw new ForbiddenException(
                'Permission scope must match the role scope',
            );
        }
        if (error.message === ROLES_REPO_ERROR.SELF_ROLE_MODIFICATION) {
            throw new ForbiddenException(
                'Staff cannot modify or delete their own role',
            );
        }
        if (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_HIERARCHY) {
            throw new ForbiddenException(
                'Cannot modify a role with the same or higher hierarchy',
            );
        }
        if (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS) {
            throw new ForbiddenException(
                'Cannot access roles outside your scope',
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
                throw this.permissionRelationNotFound(error);
            }
            if (error.code === 'P2025') {
                if (
                    prismaHintIncludes(
                        error,
                        'nested connect',
                        'inline connect',
                    )
                ) {
                    throw this.permissionRelationNotFound(error);
                }
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

        if (error instanceof Error) {
            this.mapRepoNotFound(error);
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                const targets = Array.isArray(error.meta?.target)
                    ? error.meta.target.map(String)
                    : [];
                if (
                    targets.includes('hierarchy') ||
                    targets.includes('scope_type')
                ) {
                    throw new ConflictException(
                        'A role with this hierarchy already exists for this scope',
                    );
                }
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

    private permissionRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'permission':
                return new NotFoundException('Permission not found');
            case 'role':
                return new NotFoundException('Role not found');
            case 'staff':
                return new NotFoundException('Staff not found');
            default:
                if (prismaHintIncludes(error, 'permission_id')) {
                    return new NotFoundException('Permission not found');
                }
                if (prismaHintIncludes(error, 'role_id')) {
                    return new NotFoundException('Role not found');
                }
                return new NotFoundException('Permission not found');
        }
    }
}
