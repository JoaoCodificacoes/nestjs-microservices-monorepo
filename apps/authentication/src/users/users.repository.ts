// apps/authentication/src/users.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema'; // <--- Import UserDocument

@Injectable()
export class UsersRepository {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}


  async create(user: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(user);
    return newUser.save();
  }

  async findOne(filterQuery: FilterQuery<User>): Promise<UserDocument | null> {
    return this.userModel.findOne(filterQuery);
  }

  async find(filterQuery: FilterQuery<User>): Promise<UserDocument[]> {
    return this.userModel.find(filterQuery);
  }
}
