import { Logger, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  ConfigurableModuleClass,
  REDIS_CLIENT,
  REDIS_MODULE_OPTIONS,
  type RedisModuleOptions,
} from './redis.module-definition.js';
import { RedisService } from './redis.service.js';

const logger = new Logger('RedisModule');

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [REDIS_MODULE_OPTIONS],
      useFactory: (options: RedisModuleOptions): Redis => {
        let client: Redis;

        if (options.url) {
          logger.log(
            `Connecting to Redis via URL (keyPrefix=${options.keyPrefix ?? 'none'})`,
          );
          client = new Redis(options.url, {
            keyPrefix: options.keyPrefix,
          });
        } else {
          const host = options.host ?? '127.0.0.1';
          const port = options.port ?? 6379;
          logger.log(
            `Connecting to Redis at ${host}:${port} db=${options.db ?? 0} (keyPrefix=${options.keyPrefix ?? 'none'})`,
          );
          client = new Redis({
            host,
            port,
            password: options.password,
            db: options.db,
            keyPrefix: options.keyPrefix,
          });
        }

        client.on('connect', () => logger.log('Redis connected'));
        client.on('ready', () => logger.log('Redis ready'));
        client.on('error', (error) =>
          logger.error(`Redis error: ${error.message}`),
        );
        client.on('close', () => logger.warn('Redis connection closed'));
        client.on('reconnecting', () => logger.warn('Redis reconnecting'));

        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule extends ConfigurableModuleClass {}
