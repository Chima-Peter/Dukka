import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface SupabaseModuleOptions {
  url: string;
  serviceRoleKey: string;
  buckets: string[];
}

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: SUPABASE_MODULE_OPTIONS,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<SupabaseModuleOptions>({
  moduleName: 'Supabase',
})
  .setExtras<{ isGlobal?: boolean }>(
    { isGlobal: false },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();

export type SupabaseModuleAsyncOptions = typeof ASYNC_OPTIONS_TYPE;
