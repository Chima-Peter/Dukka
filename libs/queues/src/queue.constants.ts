export const MAIL_QUEUE = 'mail';

export const MAIL_JOBS = {
    SEND: 'send',
} as const;

export type MailJobName = (typeof MAIL_JOBS)[keyof typeof MAIL_JOBS];

/**
 * Mail jobs retry up to 5 attempts with exponential backoff from 5s
 * (5s → 10s → 20s → 40s). Failed jobs are capped by age and count so
 * the longest-staying failures are dropped first when the set is trimmed.
 */
export const MAIL_JOB_OPTIONS = {
    attempts: 5,
    backoff: {
        type: 'exponential' as const,
        delay: 5_000,
    },
    removeOnFail: {
        age: 24 * 60 * 60,
        count: 1_000,
    },
};

export const MAIL_TEMPLATES = {
    CUSTOMER_WELCOME: 'customer.welcome',
    CUSTOMER_PASSWORD_RESET: 'customer.password-reset',
    CUSTOMER_PASSWORD_CHANGED: 'customer.password-changed',
    CUSTOMER_ACCOUNT_DELETION: 'customer.account-deletion',
    CUSTOMER_ACCOUNT_DELETED: 'customer.account-deleted',
    STAFF_WELCOME: 'staff.welcome',
    STAFF_PASSWORD_RESET: 'staff.password-reset',
    STAFF_PASSWORD_CHANGED: 'staff.password-changed',
    STAFF_DEACTIVATED: 'staff.deactivated',
    STAFF_ACCOUNT_UPDATED: 'staff.account-updated',
    STAFF_ROLE_ASSIGNED: 'staff.role-assigned',
    STAFF_ROLE_UPDATED: 'staff.role-updated',
    STAFF_PERMISSIONS_CHANGED: 'staff.permissions-changed',
    STAFF_MARKETS_CHANGED: 'staff.markets-changed',
    MARKET_UPDATED: 'market.updated',
    MARKET_DELETED: 'market.deleted',
} as const;

export type MailTemplate =
    (typeof MAIL_TEMPLATES)[keyof typeof MAIL_TEMPLATES];
