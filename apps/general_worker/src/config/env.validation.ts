import Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    REDIS_URL: Joi.string().uri().default('redis://127.0.0.1:6379'),
    SUPABASE_URL: Joi.string().uri().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    SUPABASE_BUCKETS: Joi.string().required(),
});
