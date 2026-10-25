import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface PrismaModuleOptions {
    databaseUrl: string;
}

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: PRISMA_MODULE_OPTIONS,
    ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<PrismaModuleOptions>({
    moduleName: 'Prisma',
})
    .setExtras<{ isGlobal?: boolean }>(
        { isGlobal: false },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal,
        }),
    )
    .build();

export type PrismaModuleAsyncOptions = typeof ASYNC_OPTIONS_TYPE;
