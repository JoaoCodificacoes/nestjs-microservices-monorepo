import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { CreateUserDto } from '@app/common';

@Controller('auth')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.gatewayService.createUser(createUserDto);
    } catch (error) {
      const typedError = error as Error;
      throw new HttpException(
        typedError.message || 'Registration failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('users')
  async getUsers() {
    try {
      return await this.gatewayService.getUsers();
    } catch (error) {
      const typedError = error as Error;
      throw new HttpException(
        typedError.message || 'Failed to get users',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
