import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { RpcException } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users/users.repository';

/* eslint-disable */
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let usersRepository: any;
  let cacheManager: Cache;
  let jwtService: JwtService;

  const mockUsersRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
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
          provide: UsersRepository,
          useValue: mockUsersRepository,
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
    usersRepository = module.get<UsersRepository>(UsersRepository);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    jwtService = module.get<JwtService>(JwtService);
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

      mockUsersRepository.findOne.mockResolvedValue(null);

      mockUsersRepository.create.mockResolvedValue({
        _id: '123',
        ...createUserDto,

      });

      const result = await service.register(createUserDto);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 'salt');


      expect(usersRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ...createUserDto,
        password: 'hashedPassword'
      }));

      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(result).toEqual(expect.objectContaining({
        _id: '123',
        email: createUserDto.email,
      }));
      expect(result).not.toHaveProperty('password');
    });

    it('should throw RpcException if user already exists', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ _id: '123' });
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
      (mockCacheManager.get as jest.Mock).mockResolvedValue(cachedUsers);

      const result = await service.getUsers();

      expect(result).toEqual(cachedUsers);
      expect(cacheManager.get).toHaveBeenCalledWith('all_users');
      expect(usersRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch from DB and set cache if empty (CACHE MISS)', async () => {
      const dbUsers = [
        { _id: '2', name: 'DB User', email: 'db@test.com', password: 'hash' },
      ];
      (mockCacheManager.get as jest.Mock).mockResolvedValue(null);
      mockUsersRepository.find.mockResolvedValue(dbUsers);

      const result = await service.getUsers();

      expect(usersRepository.find).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'all_users',
        expect.any(Array),
      );
      expect(result[0].email).toBe('db@test.com');
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@test.com', password: 'password123' };

    it('should throw RpcException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(RpcException);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ email: loginDto.email });
    });

    it('should throw RpcException if password is invalid', async () => {
      const mockUser = {
        _id: '123',
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
      };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(RpcException);
    });

    it('should return access token and user data on successful login', async () => {
      const mockUser = {
        _id: '123',
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
      };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

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