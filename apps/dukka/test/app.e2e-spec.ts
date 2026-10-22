import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app.controller.js';

vi.mock('../../../libs/common/src/index.ts', () => ({
    Public: () => () => undefined,
    ResponseMessage: () => () => undefined,
}));

/**
 * Boots a minimal app surface (health only) so e2e does not load the full
 * AppModule graph (@app/common guards/redis/supabase), which Vitest cannot
 * transform due to Nest parameter decorators.
 */
describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('boots the application', () => {
        expect(app).toBeDefined();
    });

    it('GET /health returns ok', async () => {
        const response = await request(app.getHttpServer()).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
