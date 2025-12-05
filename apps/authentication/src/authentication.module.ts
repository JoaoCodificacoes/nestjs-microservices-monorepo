import { Module } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { User, UserSchema } from './users/schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, LoggerModule, RedisModule } from '@app/core';
import { CommonJwtModule } from '@app/core/jwt/jwt.module';
import { UsersRepository } from './users/users.repository';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    RedisModule,
    CommonJwtModule,

    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, UsersRepository],
})
export class AuthenticationModule {}
