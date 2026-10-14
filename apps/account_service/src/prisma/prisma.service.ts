import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { ConfigType } from '../config/env.interface.js';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor(configService: ConfigService<ConfigType, true>) {
        const connectionString = configService.getOrThrow('DATABASE_URL', {
            infer: true,
        });
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
