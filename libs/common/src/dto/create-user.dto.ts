import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // <--- Import this

export class CreateUserDto {
  @ApiProperty({ example: 'user', description: 'The user name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'user@test.com',
    description: 'Unique email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Strong password (min 6 chars)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
