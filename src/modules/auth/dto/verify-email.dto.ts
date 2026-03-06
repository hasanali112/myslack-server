import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The verification token sent to the user email',
    example: 'a1b2c3d4e5f6g7h8i9j0',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
