import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class MarkMessagesReadDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiProperty({
    example: ["9b5f9b3c-1a2b-4c3d-8e9f-1234567890ab"],
  })
  messageIds: string[];
}
