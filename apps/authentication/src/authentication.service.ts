import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto, UserDto } from '@app/common';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserDto> {
    const { email, password, ...rest } = createUserDto;
    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      this.logger.warn('Registration failed: User already exists');
      throw new RpcException('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new this.userModel({
      ...rest,
      email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // INVALIDATE CACHE
    await this.cacheManager.del('all_users');
    this.logger.log(`User registered. Cache 'all_users' invalidated.`);

    return {
      _id: savedUser._id.toString(),
      name: savedUser.name,
      email: savedUser.email,
    };
  }

  async getUsers(): Promise<UserDto[]> {
    const cacheKey = 'all_users';

    const cachedUsers = await this.cacheManager.get<UserDto[]>(cacheKey);
    if (cachedUsers) {
      this.logger.log('Retrieved users from CACHE');
      return cachedUsers;
    }

    const users = await this.userModel.find({});
    this.logger.log(`Retrieved ${users.length} users from DB`);

    const usersDto = users.map((user) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));

    await this.cacheManager.set(cacheKey, usersDto);

    return usersDto;
  }
}
