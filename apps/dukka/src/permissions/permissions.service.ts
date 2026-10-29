import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { RedisService, type Permission } from '@app/common';
import { RedisKeys, STAFF_PERMISSIONS_TTL_SECONDS } from '../shared/index.js';
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
        private readonly redisService: RedisService,
    ) {}

    async findAll(): Promise<Permission[]> {
        try {
            this.logger.log('Fetching permissions');
            const permissions = await this.permissionsRepository.findAll();
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

    async cacheStaffPermissions(
        staffId: string,
        permissions: string[],
    ): Promise<void> {
        await this.redisService.setObject(
            RedisKeys.staffPermissions(staffId),
            permissions,
            STAFF_PERMISSIONS_TTL_SECONDS,
        );
    }

    async getStaffPermissions(staffId: string): Promise<string[]> {
        const cached = await this.redisService.getObject<string[]>(
            RedisKeys.staffPermissions(staffId),
        );
        if (cached !== null) {
            return cached;
        }

        const permissions =
            (await this.permissionsRepository.findNamesByStaffId(staffId)) ??
            [];
        await this.cacheStaffPermissions(staffId, permissions);
        return permissions;
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
