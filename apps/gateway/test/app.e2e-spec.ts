import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GatewayModule } from '../src/gateway.module';
import { GatewayService } from '../src/gateway.service';


/* eslint-disable */
describe('Gateway Rate Limiting (e2e)', () => {
  let app: INestApplication;

  const mockGatewayService = {
    createUser: jest
      .fn()
      .mockResolvedValue({ _id: '1', email: 'test@test.com' }),
    getUsers: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GatewayModule],
    })
      .overrideProvider(GatewayService)
      .useValue(mockGatewayService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow 10 requests and block the 11th', async () => {
    const dto = {
      name: 'Spammer',
      email: 'spam@test.com',
      password: 'password123',
    };

    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(429);
  });
});
