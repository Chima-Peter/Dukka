import {
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { type Permission, type ScopeType } from '@app/common';
import {
    visibleRoleScopeTypes,
    type StaffScopeRef,
} from '../shared/index.js';
import { PermissionsRepository } from './permissions.repository.js';

type StaffWithRolePermissions = {
    role: {
        role_permissions: { permission: { name: string } }[];
    } | null;
};

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(
        private readonly permissionsRepository: PermissionsRepository,
    ) {}

    async findAll(actor_scope_type: ScopeType | null): Promise<Permission[]> {
        try {
            const scopeTypes = visibleRoleScopeTypes(actor_scope_type);
            if (scopeTypes === null) {
                throw new ForbiddenException(
                    'Cannot view permissions without an assigned role scope',
                );
            }

            this.logger.log(
                `Fetching permissions for scopes: ${scopeTypes.join(', ')}`,
            );
            const permissions =
                await this.permissionsRepository.findAll(scopeTypes);
            this.logger.log('Fetched permissions');
            return permissions;
        } catch (error) {
            this.handleError(error);
        }
    }

    extractPermissionNames(staff: StaffWithRolePermissions): string[] {
        return (
            staff.role?.role_permissions.map(
                (rolePermission) => rolePermission.permission.name,
            ) ?? []
        );
    }

    async getStaffPermissions(staffId: string): Promise<string[]> {
        return (
            (await this.permissionsRepository.findNamesByStaffId(staffId)) ??
            []
        );
    }

    async getStaffPermissionsInScope(
        staffId: string,
        actor: {
            scopes: readonly StaffScopeRef[];
            market_ids: string[];
            hierarchy: number | null;
        },
    ): Promise<string[]> {
        const names =
            await this.permissionsRepository.findNamesByStaffIdInScope(
                staffId,
                actor,
            );
        if (names === null) {
            throw new ForbiddenException(
                'Cannot view permissions for staff outside your assigned scope',
            );
        }
        return names;
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
