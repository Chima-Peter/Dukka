import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsService } from './shipments.service.js';

describe('ShipmentsController', () => {
    let controller: ShipmentsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShipmentsController],
            providers: [
                {
                    provide: ShipmentsService,
                    useValue: {
                        move: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ShipmentsController>(ShipmentsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
