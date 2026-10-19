import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    ACCOUNT_HTTP_CLIENT,
    InjectHttpClient,
    RedisService,
    type ApiResponse,
    type HttpClient,
    type StaffPermissionsReader,
} from '@app/common';

/** Same key account_service writes when caching staff permissions. */
const staffPermissionsKey = (staffId: string) =>
    `staff_permissions:${staffId}`;

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
}
