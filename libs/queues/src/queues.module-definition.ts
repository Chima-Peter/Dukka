import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface QueuesModuleOptions {
    /**
     * Redis connection URL (e.g. redis://localhost:6379).
     * Preferred when a single connection string is available.
     */
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    /**
     * Prefix for all BullMQ queue keys (defaults to bull).
     */
    prefix?: string;
}

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: QUEUES_MODULE_OPTIONS,
    ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<QueuesModuleOptions>({
    moduleName: 'Queues',
})
    .setExtras<{ isGlobal?: boolean }>(
        { isGlobal: false },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal,
        }),
    )
    .build();

export type QueuesModuleAsyncOptions = typeof ASYNC_OPTIONS_TYPE;
