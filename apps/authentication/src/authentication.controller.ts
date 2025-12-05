import { Controller } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto, LoginDto, LoginRto } from '@app/common';

@Controller()
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @MessagePattern({ cmd: 'register' })
  async register(@Payload() createUserDto: CreateUserDto) {
    return this.authenticationService.register(createUserDto);
  }

  @MessagePattern({ cmd: 'getUsers' })
  async getUsers() {
    return this.authenticationService.getUsers();
  }

  @MessagePattern({ cmd: 'login' })
  async login(@Payload() loginDto: LoginDto): Promise<LoginRto> {
    return this.authenticationService.login(loginDto);
  }
}
