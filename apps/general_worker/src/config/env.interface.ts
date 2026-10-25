export interface ConfigType {
    NODE_ENV: 'development' | 'production' | 'test';
    REDIS_URL: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    SUPABASE_BUCKETS: string;
}
