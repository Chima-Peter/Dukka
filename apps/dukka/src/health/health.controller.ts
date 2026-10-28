import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Public, PrismaService, SkipTransform } from '@app/common';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    PrismaHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health.js';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly disk: DiskHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly prismaHealth: PrismaHealthIndicator,
        private readonly prisma: PrismaService,
        private readonly redisHealth: RedisHealthIndicator,
    ) {}

    @Get()
    @Public()
    @SkipTransform()
    @HealthCheck()
    check() {
        return this.health.check([
            () =>
                this.disk.checkStorage('disk', {
                    path: '/',
                    thresholdPercent: 0.7,
                }),
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
            () =>
                this.prismaHealth
                    .pingCheck('database', this.prisma)
                    .withTimeout(2000),
            () => this.redisHealth.ping('redis'),
            () => this.redisHealth.pingGeneralQueue('redis_general_queue'),
            () => this.redisHealth.pingMailQueue('redis_mail_queue'),
        ]);
    }
}
