import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { CreateUserDto, LoginDto, LoginRto, UserRto } from '@app/common';
import { AuthGuard } from '@nestjs/passport';

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

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginRto> {
    try {
      return await this.gatewayService.login(loginDto);
    } catch (error) {
      const typedError = error as Error;
      throw new HttpException(
        typedError.message || 'Login failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  async getUsers(): Promise<UserRto[]> {
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
