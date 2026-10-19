export const REQUEST_USER_KEY = 'user';
export const STAFF_JWT_SERVICE = 'STAFF_JWT_SERVICE';
export const STAFF_PERMISSIONS_SERVICE = 'STAFF_PERMISSIONS_SERVICE';

export interface StaffPermissionsReader {
    getStaffPermissions(
        staffId: string,
        accessToken?: string,
    ): Promise<string[]>;
}

export const blacklistedTokenKey = (token: string) =>
    `blacklisted:token:${token}`;
