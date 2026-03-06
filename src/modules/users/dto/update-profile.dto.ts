import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'Hasan Mahmud' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @ApiPropertyOptional({ example: 'Product Designer' })
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @ApiPropertyOptional({ example: 'Building calm, focused collaboration experiences.' })
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiPropertyOptional({ example: '+1 555 123 4567' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @ApiPropertyOptional({ example: 'New York, USA' })
  location?: string;
}
