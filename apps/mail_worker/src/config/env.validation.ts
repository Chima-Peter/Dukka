import Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    REDIS_URL: Joi.string().uri().default('redis://127.0.0.1:6379'),
    MAIL_FROM: Joi.string().required(),
    SMTP_HOST: Joi.string().required(),
    SMTP_PORT: Joi.number().port().default(587),
    SMTP_USER: Joi.string().allow('').optional(),
    SMTP_PASS: Joi.string().allow('').optional(),
    SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
});
