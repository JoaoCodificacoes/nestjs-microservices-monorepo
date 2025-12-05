import { Module } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { User, UserSchema } from './schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, LoggerModule, RedisModule } from '@app/core';
import { CommonJwtModule } from '@app/core/jwt/jwt.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    RedisModule,
    CommonJwtModule,

    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService],
})
export class AuthenticationModule {}
