import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto, UserRto, LoginDto, LoginRto } from '@app/common'; // <--- Import LoginDto
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserRto> {
    return firstValueFrom(
      this.authClient.send({ cmd: 'register' }, createUserDto),
    );
  }

  async getUsers(): Promise<UserRto[]> {
    return firstValueFrom(this.authClient.send({ cmd: 'getUsers' }, {}));
  }

  async login(loginDto: LoginDto): Promise<LoginRto> {
    return firstValueFrom(this.authClient.send({ cmd: 'login' }, loginDto));
  }
}
