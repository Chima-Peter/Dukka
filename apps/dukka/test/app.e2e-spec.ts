import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
    DiskHealthIndicator,
    HealthCheckService,
    MemoryHealthIndicator,
    PrismaHealthIndicator,
} from '@nestjs/terminus';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/health/health.controller.js';

vi.mock('../../../libs/common/src/index.ts', () => ({
    Public: () => () => undefined,
    SkipTransform: () => () => undefined,
    PrismaService: class PrismaService {},
}));

vi.mock('../src/health/redis.health.js', () => ({
    RedisHealthIndicator: class RedisHealthIndicator {},
}));

/**
 * Boots a minimal health surface so e2e does not load the full
 * AppModule graph (@app/common guards/redis/supabase), which Vitest cannot
 * transform due to Nest parameter decorators.
 */
describe('HealthController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const { RedisHealthIndicator } = await import(
            '../src/health/redis.health.js'
        );

        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: {
                        check: vi.fn().mockResolvedValue({
                            status: 'ok',
                            info: {
                                disk: { status: 'up' },
                                memory_heap: { status: 'up' },
                                database: { status: 'up' },
                                redis: { status: 'up' },
                                redis_general_queue: { status: 'up' },
                                redis_mail_queue: { status: 'up' },
                            },
                            error: {},
                            details: {
                                disk: { status: 'up' },
                                memory_heap: { status: 'up' },
                                database: { status: 'up' },
                                redis: { status: 'up' },
                                redis_general_queue: { status: 'up' },
                                redis_mail_queue: { status: 'up' },
                            },
                        }),
                    },
                },
                { provide: DiskHealthIndicator, useValue: {} },
                { provide: MemoryHealthIndicator, useValue: {} },
                { provide: PrismaHealthIndicator, useValue: {} },
                { provide: RedisHealthIndicator, useValue: {} },
            ],
        })
            .useMocker(() => ({}))
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('boots the application', () => {
        expect(app).toBeDefined();
    });

    it('GET /health returns terminus health result', async () => {
        const response = await request(app.getHttpServer()).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.details).toMatchObject({
            disk: { status: 'up' },
            memory_heap: { status: 'up' },
            database: { status: 'up' },
            redis: { status: 'up' },
            redis_general_queue: { status: 'up' },
            redis_mail_queue: { status: 'up' },
        });
    });
});
