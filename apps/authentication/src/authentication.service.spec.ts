import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { RpcException } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';

/* eslint-disable */
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let model: any;
  let cacheManager: any;
  let jwtService: any;

  const mockUserModel = class {
    save: any;
    constructor(private data: any) {
      this.save = jest.fn().mockResolvedValue({ _id: '123', ...this.data });
    }
    static findOne = jest.fn();
    static find = jest.fn();
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('test_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    model = module.get(getModelToken(User.name));
    cacheManager = module.get(CACHE_MANAGER);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const createUserDto = {
      name: 'Test User',
      email: 'test@test.com',
      password: 'password123',
    };

    it('should register a new user and invalidate cache', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      const result = await service.register(createUserDto);

      expect(model.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 'salt');
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(result).toEqual({
        _id: '123',
        name: createUserDto.name,
        email: createUserDto.email,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw RpcException if user already exists', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue({ _id: '123' });
      await expect(service.register(createUserDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getUsers', () => {
    it('should return cached users if available (CACHE HIT)', async () => {
      const cachedUsers = [
        { _id: '1', name: 'Cached User', email: 'cache@test.com' },
      ];
      cacheManager.get.mockResolvedValue(cachedUsers);

      const result = await service.getUsers();

      expect(result).toEqual(cachedUsers);
      expect(cacheManager.get).toHaveBeenCalledWith('all_users');
      expect(model.find).not.toHaveBeenCalled();
    });

    it('should fetch from DB and set cache if empty (CACHE MISS)', async () => {
      const dbUsers = [
        { _id: '2', name: 'DB User', email: 'db@test.com', password: 'hash' },
      ];
      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(model, 'find').mockResolvedValue(dbUsers);

      const result = await service.getUsers();

      expect(model.find).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'all_users',
        expect.any(Array),
      );
      expect(result[0].email).toBe('db@test.com');
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@test.com', password: 'password123' };

    it('should throw RpcException if user not found', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(RpcException);
      expect(model.findOne).toHaveBeenCalledWith({ email: loginDto.email });
    });

    it('should throw RpcException if password is invalid', async () => {
      const mockUser = {
        _id: '123',
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
      };
      jest.spyOn(model, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(RpcException);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it('should return access token and user data on successful login', async () => {
      const mockUser = {
        _id: '123',
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
      };
      jest.spyOn(model, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toEqual({
        access_token: 'test_token',
        user: {
          _id: '123',
          name: 'Test User',
          email: loginDto.email,
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '123',
        email: loginDto.email,
      });
    });
  });
});