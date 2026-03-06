import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  @ApiProperty({ example: 'hasan@gmail.com' })
  email: string;

  @MinLength(6)
  @MaxLength(20)
  @IsString()
  @ApiProperty({ example: 'hasan123' })
  password: string;

  @IsString()
  @ApiProperty({ example: 'Hasan Mahmud' })
  fullName: string;
}
