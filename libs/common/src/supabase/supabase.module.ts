import { Logger, Module } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
    ConfigurableModuleClass,
    SUPABASE_CLIENT,
    SUPABASE_MODULE_OPTIONS,
    type SupabaseModuleOptions,
} from './supabase.module-definition.js';
import { SupabaseService } from './supabase.service.js';

const logger = new Logger('SupabaseModule');

@Module({
    providers: [
        {
            provide: SUPABASE_CLIENT,
            inject: [SUPABASE_MODULE_OPTIONS],
            useFactory: (options: SupabaseModuleOptions): SupabaseClient => {
                logger.log(
                    `Initializing Supabase client (buckets=${options.buckets.join(', ') || 'none'})`,
                );

                return createClient(options.url, options.serviceRoleKey);
            },
        },
        SupabaseService,
    ],
    exports: [SupabaseService],
})
export class SupabaseModule extends ConfigurableModuleClass {}
