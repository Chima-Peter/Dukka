import { Injectable } from '@nestjs/common';
import { RedisService, type StaffPermissionsReader } from '@app/common';

/** Same key account_service writes when caching staff permissions. */
const staffPermissionsKey = (staffId: string) =>
    `staff_permissions:${staffId}`;

@Injectable()
export class StaffPermissionsCacheService implements StaffPermissionsReader {
    constructor(private readonly redisService: RedisService) {}

    async getStaffPermissions(staffId: string): Promise<string[]> {
        const cached = await this.redisService.getObject<string[]>(
            staffPermissionsKey(staffId),
        );
        return cached ?? [];
    }
}
