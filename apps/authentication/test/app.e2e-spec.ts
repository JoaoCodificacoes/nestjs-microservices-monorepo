import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { AuthenticationModule } from '../src/authentication.module';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

/* eslint-disable */
describe('AuthenticationController (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let dbConnection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuthenticationModule,
        ClientsModule.register([
          {
            name: 'TEST_CLIENT',
            transport: Transport.TCP,
            options: { host: '127.0.0.1', port: 4001 },
          },
        ]),
      ],
    })

      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'MONGO_URI') {
            return process.env.MONGO_URI
              ? process.env.MONGO_URI.replace('/aladia', '/aladia_test')
              : 'mongodb://localhost:27017/aladia_test';
          }
          return process.env[key];
        },
      })
      .compile();

    app = moduleFixture.createNestMicroservice({
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 4001,
      },
    });
    await app.listen();

    client = app.get('TEST_CLIENT');
    await client.connect();

    dbConnection = app.get(getConnectionToken());
    await dbConnection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
    client.close();
  });

  const uniqueEmail = `e2e-${Date.now()}@test.com`;

  it('Step 1: Register a new user', async () => {
    const createUserDto = {
      name: 'E2E User',
      email: uniqueEmail,
      password: 'password123',
    };

    const response = await firstValueFrom(
      client.send({ cmd: 'register' }, createUserDto),
    );

    expect(response).toHaveProperty('_id');
    expect(response.email).toEqual(uniqueEmail);
    expect(response).not.toHaveProperty('password');
  });

  it('Step 2: Get all users and verify the new user is there', async () => {
    const response = await firstValueFrom(client.send({ cmd: 'getUsers' }, {}));

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBeGreaterThan(0);

    const createdUser = response.find((user) => user.email === uniqueEmail);

    expect(createdUser).toBeDefined();
    expect(createdUser.name).toBe('E2E User');
    expect(createdUser).not.toHaveProperty('password');
  });
});
