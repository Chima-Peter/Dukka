export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 5 * 60;
export const PASSWORD_RESET_VERIFIED_TTL_SECONDS = 1 * 60;
export const ACCOUNT_DELETION_TOKEN_TTL_SECONDS = 5 * 60;
export const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const RedisKeys = {
  passwordResetToken: (email: string) => `password_reset:token:${email}`,
  passwordResetVerified: (email: string) => `password_reset:verified:${email}`,
  accountDeletionToken: (email: string) => `account_deletion:token:${email}`,
  blacklistedToken: (token: string) => `blacklisted:token:${token}`,
} as const;
