export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 5 * 60;
export const PASSWORD_RESET_VERIFIED_TTL_SECONDS = 1 * 60;
export const ACCOUNT_DELETION_TOKEN_TTL_SECONDS = 5 * 60;
export const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 1 day
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const STAFF_ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const STAFF_REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 1 day
export const STAFF_PERMISSIONS_TTL_SECONDS = 60 * 60; // 1 hour

export const RedisKeys = {
    passwordResetToken: (email: string) => `password_reset:token:${email}`,
    passwordResetVerified: (email: string) =>
        `password_reset:verified:${email}`,
    staffPasswordResetToken: (email: string) =>
        `staff_password_reset:token:${email}`,
    staffPasswordResetVerified: (email: string) =>
        `staff_password_reset:verified:${email}`,
    staffPermissions: (staffId: string) => `staff_permissions:${staffId}`,
    accountDeletionToken: (email: string) => `account_deletion:token:${email}`,
    blacklistedToken: (token: string) => `blacklisted:token:${token}`,
} as const;
