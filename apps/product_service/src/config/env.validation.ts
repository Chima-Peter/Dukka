import Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PRODUCT_SERVICE_PORT: Joi.number().port().default(3001),
    DATABASE_URL: Joi.string().required(),
    DIRECT_URL: Joi.string().required(),
    OBSERVE_SERVICE_NAME: Joi.string().required(),
    OBSERVE_APP_KEY: Joi.string().required(),
    OBSERVE_APP_SECRET: Joi.string().required(),
    POSTGRES_PORT: Joi.number().port().required(),
    RABBITMQ_PORT: Joi.number().port().required(),
    KAFKA_PORT: Joi.number().port().required(),
    JWT_PUBLIC_KEY_PATH: Joi.string().required(),
    STAFF_JWT_PUBLIC_KEY_PATH: Joi.string().required(),
    ACCOUNT_SERVICE_URL: Joi.string().uri().required(),
    REDIS_URL: Joi.string().uri().default('redis://127.0.0.1:6379'),
    SUPABASE_URL: Joi.string().uri().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    SUPABASE_BUCKETS: Joi.string().required(),
});
