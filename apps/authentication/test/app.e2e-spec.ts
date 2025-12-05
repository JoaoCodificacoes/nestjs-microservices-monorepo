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
    await dbConnection.collection('users').deleteMany({});
    await client.close();
    await app.close();
    await dbConnection.close();
  });

  const uniqueEmail = `e2e-${Date.now()}@test.com`;
  const testPassword = 'password123';
  let userId: string;

  describe('User Registration Flow', () => {
    it('should register a new user', async () => {
      const createUserDto = {
        name: 'E2E User',
        email: uniqueEmail,
        password: testPassword,
      };

      const response = await firstValueFrom(
        client.send({ cmd: 'register' }, createUserDto),
      );

      expect(response).toHaveProperty('_id');
      expect(response.email).toEqual(uniqueEmail);
      expect(response.name).toBe('E2E User');
      expect(response).not.toHaveProperty('password');

      userId = response._id;
    });

    it('should throw error when registering duplicate email', async () => {
      const createUserDto = {
        name: 'Duplicate User',
        email: uniqueEmail,
        password: 'another_password',
      };

      try {
        await firstValueFrom(client.send({ cmd: 'register' }, createUserDto));
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message || error.error).toMatch(/already exists/i);
      }
    });
  });

  describe('User Retrieval', () => {
    it('should get all users and verify the new user is there', async () => {
      const response = await firstValueFrom(
        client.send({ cmd: 'getUsers' }, {}),
      );

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);

      const createdUser = response.find((user) => user.email === uniqueEmail);

      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('E2E User');
      expect(createdUser._id).toBe(userId);
      expect(createdUser).not.toHaveProperty('password');
    });
  });

  describe('User Login Flow', () => {
    it('should login with correct credentials and return access token', async () => {
      const loginDto = {
        email: uniqueEmail,
        password: testPassword,
      };

      const response = await firstValueFrom(
        client.send({ cmd: 'login' }, loginDto),
      );

      expect(response).toHaveProperty('access_token');
      expect(response).toHaveProperty('user');
      expect(response.access_token).toBeTruthy();
      expect(typeof response.access_token).toBe('string');

      expect(response.user).toHaveProperty('_id');
      expect(response.user).toHaveProperty('email');
      expect(response.user).toHaveProperty('name');
      expect(response.user.email).toBe(uniqueEmail);
      expect(response.user.name).toBe('E2E User');
      expect(response.user).not.toHaveProperty('password');
    });

    it('should throw error when logging in with non-existent email', async () => {
      const loginDto = {
        email: 'nonexistent@test.com',
        password: testPassword,
      };

      try {
        await firstValueFrom(client.send({ cmd: 'login' }, loginDto));
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message || error.error).toMatch(
          /Invalid credentials|not found/i,
        );
      }
    });

    it('should throw error when logging in with incorrect password', async () => {
      const loginDto = {
        email: uniqueEmail,
        password: 'wrongpassword',
      };

      try {
        await firstValueFrom(client.send({ cmd: 'login' }, loginDto));
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message || error.error).toMatch(/Invalid credentials/i);
      }
    });

    it('should throw error when password is missing', async () => {
      const loginDto = {
        email: uniqueEmail,
      };

      try {
        await firstValueFrom(client.send({ cmd: 'login' }, loginDto as any));
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        // Either validation error or manual check in service
        expect(error.message || error.error).toMatch(
          /password|required|credentials/i,
        );
      }
    });

    it('should throw error when email is missing', async () => {
      const loginDto = {
        password: testPassword,
      };

      try {
        await firstValueFrom(client.send({ cmd: 'login' }, loginDto as any));
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        // Either validation error or manual check in service
        expect(error.message || error.error).toMatch(
          /email|required|credentials/i,
        );
      }
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache after new user registration', async () => {
      const newUniqueEmail = `e2e-cache-${Date.now()}@test.com`;

      // Get initial user count
      const beforeResponse = await firstValueFrom(
        client.send({ cmd: 'getUsers' }, {}),
      );
      const beforeCount = beforeResponse.length;

      // Register new user
      const createUserDto = {
        name: 'Cache Test User',
        email: newUniqueEmail,
        password: 'password123',
      };

      await firstValueFrom(client.send({ cmd: 'register' }, createUserDto));

      // Get updated user count
      const afterResponse = await firstValueFrom(
        client.send({ cmd: 'getUsers' }, {}),
      );
      const afterCount = afterResponse.length;

      expect(afterCount).toBe(beforeCount + 1);

      const newUser = afterResponse.find(
        (user) => user.email === newUniqueEmail,
      );
      expect(newUser).toBeDefined();
      expect(newUser.name).toBe('Cache Test User');
    });
  });

  describe('Password Security', () => {
    it('should never expose password in any response', async () => {
      const testEmail = `security-${Date.now()}@test.com`;

      // Register
      const registerResponse = await firstValueFrom(
        client.send(
          { cmd: 'register' },
          {
            name: 'Security Test',
            email: testEmail,
            password: 'secret123',
          },
        ),
      );
      expect(registerResponse).not.toHaveProperty('password');

      // Login
      const loginResponse = await firstValueFrom(
        client.send(
          { cmd: 'login' },
          { email: testEmail, password: 'secret123' },
        ),
      );
      expect(loginResponse.user).not.toHaveProperty('password');

      // Get Users
      const usersResponse = await firstValueFrom(
        client.send({ cmd: 'getUsers' }, {}),
      );
      const securityUser = usersResponse.find((u) => u.email === testEmail);
      expect(securityUser).not.toHaveProperty('password');
    });
  });
});
