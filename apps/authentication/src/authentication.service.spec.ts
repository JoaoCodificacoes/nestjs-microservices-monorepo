import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { RpcException } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager'; // <--- Import

/* eslint-disable */
describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let model: any;
  let cacheManager: any;

  const mockUserModel = class {
    save: any;

    constructor(private data: any) {
      this.save = jest.fn().mockResolvedValue({
        _id: 'some_id_123',
        ...this.data,
      });
    }
    static findOne = jest.fn();
    static find = jest.fn();
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    model = module.get(getModelToken(User.name));
    cacheManager = module.get(CACHE_MANAGER);
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

      expect(model.findOne).toHaveBeenCalledWith({ email: createUserDto.email });

      expect(cacheManager.del).toHaveBeenCalledWith('all_users');

      expect(result).toEqual({
        _id: 'some_id_123',
        name: createUserDto.name,
        email: createUserDto.email,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw RpcException if user already exists', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue({ _id: '123' });
      await expect(service.register(createUserDto)).rejects.toThrow(RpcException);
    });
  });

  describe('getUsers', () => {
    it('should return cached users if available (CACHE HIT)', async () => {
      const cachedUsers = [
        { _id: '1', name: 'Cached User', email: 'cache@test.com' }
      ];

      cacheManager.get.mockResolvedValue(cachedUsers);

      const result = await service.getUsers();

      expect(result).toEqual(cachedUsers);
      expect(cacheManager.get).toHaveBeenCalledWith('all_users');


      expect(model.find).not.toHaveBeenCalled();
    });

    it('should fetch from DB and set cache if empty (CACHE MISS)', async () => {
      const dbUsers = [
        { _id: '2', name: 'DB User', email: 'db@test.com', password: 'hash' }
      ];

      // 1. Simulate Cache MISS
      cacheManager.get.mockResolvedValue(null);

      // 2. Simulate DB Return
      jest.spyOn(model, 'find').mockResolvedValue(dbUsers);

      const result = await service.getUsers();

      expect(model.find).toHaveBeenCalled(); // Hit DB

      expect(cacheManager.set).toHaveBeenCalledWith('all_users', expect.any(Array));

      expect(result[0].email).toBe('db@test.com');
      expect(result[0]).not.toHaveProperty('password');
    });
  });
});