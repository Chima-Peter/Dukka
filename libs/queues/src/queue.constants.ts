export const MAIL_QUEUE = 'mail';

export const MAIL_JOBS = {
    SEND: 'send',
} as const;

export type MailJobName = (typeof MAIL_JOBS)[keyof typeof MAIL_JOBS];
