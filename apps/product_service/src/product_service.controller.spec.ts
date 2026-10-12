import { Test, TestingModule } from '@nestjs/testing';
import { ProductServiceController } from './product_service.controller.js';
import { ProductServiceService } from './product_service.service.js';

describe('ProductServiceController', () => {
  let productServiceController: ProductServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ProductServiceController],
      providers: [ProductServiceService],
    }).compile();

    productServiceController = app.get<ProductServiceController>(ProductServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(productServiceController.getHello()).toBe('Hello World!');
    });
  });
});
