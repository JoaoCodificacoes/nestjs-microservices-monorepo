import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { RpcException } from '@nestjs/microservices';

/* eslint-disable */
describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let model: any;

  const mockUserModel = class {
    save: any;

    constructor(private data: any) {

      this.save = jest.fn().mockResolvedValue({
        _id: 'some_id_123',
        ...this.data,
      });
    }
    static findOne = jest.fn();
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    model = module.get(getModelToken(User.name));
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

    it('should register a new user successfully', async () => {
      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      const result = await service.register(createUserDto);

      expect(model.findOne).toHaveBeenCalledWith({ email: createUserDto.email });

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
});