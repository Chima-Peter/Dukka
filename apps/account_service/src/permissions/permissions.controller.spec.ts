import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => ({
    Auth: () => () => undefined,
    ResponseMessage: () => () => undefined,
    RedisService: class RedisService {},
}));

describe('PermissionsController', () => {
    let controller: PermissionsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PermissionsController],
            providers: [
                {
                    provide: PermissionsService,
                    useValue: {
                        findAll: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<PermissionsController>(PermissionsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
