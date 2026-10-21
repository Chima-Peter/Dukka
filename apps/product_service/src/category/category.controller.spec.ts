import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';

describe('CategoryController', () => {
    let controller: CategoryController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CategoryController],
            providers: [
                {
                    provide: CategoryService,
                    useValue: {
                        create: vi.fn(),
                        addToMarket: vi.fn(),
                        findAll: vi.fn(),
                        update: vi.fn(),
                        removeFromMarket: vi.fn(),
                        delete: vi.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CategoryController>(CategoryController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
