import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto, UserDto } from '@app/common';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}
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
    this.logger.log(`User ${savedUser.name} registered successfully`);
    return {
      _id: savedUser._id.toString(),
      name: savedUser.name,
      email: savedUser.email,
    };
  }
}
