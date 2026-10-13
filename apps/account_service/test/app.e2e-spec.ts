import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './../src/app.module.js';

describe('AppModule (e2e)', () => {
  let app: INestMicroservice;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 0,
      },
    });
    await app.listen();
  });

  it('boots the application', () => {
    expect(app).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
