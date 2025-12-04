import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto, UserDto } from '@app/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    return firstValueFrom(
      this.authClient.send({ cmd: 'register' }, createUserDto),
    );
  }

  async getUsers(): Promise<UserDto[]> {
    return firstValueFrom(this.authClient.send({ cmd: 'getUsers' }, {}));
  }
}
