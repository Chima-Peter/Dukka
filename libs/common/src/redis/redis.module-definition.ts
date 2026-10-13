import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface RedisModuleOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  url?: string;
}

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: REDIS_MODULE_OPTIONS,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<RedisModuleOptions>({
  moduleName: 'Redis',
})
  .setExtras<{ isGlobal?: boolean }>(
    { isGlobal: false },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();

export type RedisModuleAsyncOptions = typeof ASYNC_OPTIONS_TYPE;
