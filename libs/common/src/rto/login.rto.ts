import { UserRto } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRto {
  @ApiProperty({ example: 'eyJhGciOiJIUzI1NiIsIn...' })
  access_token: string;

  @ApiProperty({ type: UserRto })
  user: UserRto;
}
