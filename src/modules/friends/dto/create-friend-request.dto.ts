import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFriendRequestDto {
  @ApiProperty({
    description: 'The ID of the user to send the friend request to',
  })
  @IsNotEmpty()
  @IsString()
  receiverId: string;
}
