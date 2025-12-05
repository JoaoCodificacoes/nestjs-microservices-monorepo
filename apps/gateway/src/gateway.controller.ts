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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: UserRto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., User exists)' })
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
  @ApiOperation({ summary: 'Login and get JWT' })
  @ApiCreatedResponse({
    description: 'Login successful, returns access token',
    type: LoginRto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (Invalid credentials)',
  })
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

  @Get('users')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Protected)' })
  @ApiOkResponse({
    description: 'List of all users',
    type: [UserRto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (Access token missing or invalid)',
  })
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
