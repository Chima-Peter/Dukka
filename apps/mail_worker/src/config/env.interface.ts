export interface ConfigType {
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
    REDIS_URL: string;
    MAIL_FROM: string;
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_SECURE: boolean;
}
