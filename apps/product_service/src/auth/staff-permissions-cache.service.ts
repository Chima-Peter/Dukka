import {
    Injectable,
    InternalServerErrorException,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    RedisService,
    type ApiResponse,
    type StaffPermissionsReader,
} from '@app/common';
import type { ConfigType } from '../config/env.interface.js';

/** Same key account_service writes when caching staff permissions. */
const staffPermissionsKey = (staffId: string) =>
    `staff_permissions:${staffId}`;

@Injectable()
export class StaffPermissionsCacheService implements StaffPermissionsReader {
    private readonly logger = new Logger(StaffPermissionsCacheService.name);

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService<ConfigType, true>,
    ) {}

    async getStaffPermissions(
        staffId: string,
        accessToken?: string,
    ): Promise<string[]> {
        const cached = await this.redisService.getObject<string[]>(
            staffPermissionsKey(staffId),
        );
        if (cached !== null) {
            return cached;
        }

        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }

        return this.fetchFromAccountService(staffId, accessToken);
    }

    private async fetchFromAccountService(
        staffId: string,
        accessToken: string,
    ): Promise<string[]> {
        const baseUrl = this.configService.getOrThrow('ACCOUNT_SERVICE_URL', {
            infer: true,
        });
        const url = `${baseUrl.replace(/\/$/, '')}/api/v1/accounts/permissions/staff/${staffId}`;

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                this.logger.warn(
                    `Account service permissions lookup failed (${response.status}) for staff ${staffId}`,
                );
                throw new InternalServerErrorException(
                    'Failed to resolve staff permissions',
                );
            }

            const body = (await response.json()) as ApiResponse<string[]>;
            if (!body.success || !Array.isArray(body.data)) {
                throw new InternalServerErrorException(
                    'Failed to resolve staff permissions',
                );
            }

            return body.data;
        } catch (error) {
            if (error instanceof InternalServerErrorException) {
                throw error;
            }

            this.logger.error(
                `Account service permissions lookup error for staff ${staffId}: ${error}`,
            );
            throw new InternalServerErrorException(
                'Failed to resolve staff permissions',
            );
        }
    }
}
