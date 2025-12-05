import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto, UserRto, LoginDto } from '@app/common';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from './users/users.repository';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserRto> {
    const { email, password, ...rest } = createUserDto;

    const existingUser = await this.usersRepository.findOne({ email });

    if (existingUser) {
      this.logger.warn('Registration failed: User already exists');
      throw new RpcException('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const savedUser = await this.usersRepository.create({
      ...rest,
      email,
      password: hashedPassword,
    });

    // INVALIDATE CACHE
    await this.cacheManager.del('all_users');
    this.logger.log(`User registered. Cache 'all_users' invalidated.`);

    return {
      _id: savedUser._id.toString(),
      name: savedUser.name,
      email: savedUser.email,
    };
  }

  async getUsers(): Promise<UserRto[]> {
    const cacheKey = 'all_users';

    const cachedUsers = await this.cacheManager.get<UserRto[]>(cacheKey);
    if (cachedUsers) {
      this.logger.log('Retrieved users from CACHE');
      return cachedUsers;
    }

    const users = await this.usersRepository.find({});
    this.logger.log(`Retrieved ${users.length} users from DB`);

    const usersDto = users.map((user) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));

    await this.cacheManager.set(cacheKey, usersDto);

    return usersDto;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      this.logger.warn(`Login attempt with missing credentials`);
      throw new RpcException(
        new UnauthorizedException('Email and password are required'),
      );
    }

    const user = await this.usersRepository.findOne({ email });

    if (!user) {
      this.logger.warn(`Login attempt failed: User ${email} not found`);
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login attempt failed: Invalid password for ${email}`);
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const token = await this.jwtService.signAsync(payload);

    this.logger.log(`User ${email} logged in successfully`);

    return {
      access_token: token,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };
  }
}
