import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import {
    PRISMA_MODULE_OPTIONS,
    type PrismaModuleOptions,
} from './prisma.module-definition.js';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor(
        @Inject(PRISMA_MODULE_OPTIONS) options: PrismaModuleOptions,
    ) {
        const connectionString = options.databaseUrl;
        const schema =
            new URL(connectionString).searchParams.get('schema') ?? 'public';

        super({
            adapter: new PrismaPg({ connectionString }, { schema }),
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
