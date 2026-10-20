import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller.js';

vi.mock('../../../libs/common/src/index.ts', () => ({
    Public: () => () => undefined,
    ResponseMessage: () => () => undefined,
}));

describe('AppController', () => {
    let controller: AppController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
        }).compile();

        controller = module.get<AppController>(AppController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('returns health status', () => {
        expect(controller.health()).toEqual({ status: 'ok' });
    });
});
