import { ApiProperty } from '@nestjs/swagger';

export class UserRto {
  @ApiProperty({ example: '656f2b...' })
  _id: string;

  @ApiProperty({ example: 'user@test.com' })
  email: string;

  @ApiProperty({ example: 'user' })
  name: string;
}
