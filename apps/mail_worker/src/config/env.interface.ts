export interface ConfigType {
    NODE_ENV: 'development' | 'production' | 'test';
    REDIS_URL: string;
    MAIL_FROM: string;
    RESEND_API_KEY: string;
}
