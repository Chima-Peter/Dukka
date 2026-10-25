import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './prisma.module-definition.js';
import { PrismaService } from './prisma.service.js';

@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule extends ConfigurableModuleClass {}
