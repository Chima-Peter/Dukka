export interface ConfigType {
    NODE_ENV: 'development' | 'production' | 'test';
    PRODUCT_SERVICE_PORT: number;
    DATABASE_URL: string;
    DIRECT_URL: string;
    OBSERVE_SERVICE_NAME: string;
    OBSERVE_APP_KEY: string;
    OBSERVE_APP_SECRET: string;
    POSTGRES_PORT: number;
    RABBITMQ_PORT: number;
    KAFKA_PORT: number;
    JWT_PUBLIC_KEY_PATH: string;
    STAFF_JWT_PUBLIC_KEY_PATH: string;
    ACCOUNT_SERVICE_URL: string;
    REDIS_URL: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    SUPABASE_BUCKETS: string;
}
