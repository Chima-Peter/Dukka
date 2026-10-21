import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectHttpClient, type HttpClient } from '@nestjs/http-client';
import {
    RedisService,
    type ApiResponse,
    type StaffPermissionsReader,
} from '@app/common';
import { ACCOUNT_HTTP_CLIENT } from '../shared/account-http.constants.js';

@Injectable()
export class StaffPermissionsCacheService implements StaffPermissionsReader {
    constructor(
        private readonly redisService: RedisService,
        @InjectHttpClient(ACCOUNT_HTTP_CLIENT)
        private readonly accountHttp: HttpClient,
    ) {}

    async getStaffPermissions(
        staffId: string,
        accessToken?: string,
    ): Promise<string[]> {
        const cached = await this.redisService.getObject<string[]>(
            this.staffPermissionsKey(staffId),
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
        const { data: body } = await this.accountHttp.get<
            ApiResponse<string[]>
        >('/permissions/staff/:staffId', {
            params: { staffId },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });

        if (!body.success || !Array.isArray(body.data)) {
            throw new InternalServerErrorException(
                'Failed to resolve staff permissions',
            );
        }

        return body.data;
    }

    /** Same key account_service writes when caching staff permissions. */
    private staffPermissionsKey(staffId: string): string {
        return `staff_permissions:${staffId}`;
    }
}
