export const REQUEST_USER_KEY = 'user';
export const STAFF_JWT_SERVICE = 'STAFF_JWT_SERVICE';
export const STAFF_PERMISSIONS_SERVICE = 'STAFF_PERMISSIONS_SERVICE';

export interface StaffPermissionsReader {
    getStaffPermissions(
        staffId: string,
        accessToken?: string,
    ): Promise<string[]>;
}

export const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 1 day
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const STAFF_ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const STAFF_REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 1 day

export const blacklistedTokenKey = (token: string) =>
    `blacklisted:token:${token}`;
