import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, CloudinaryProvider, CloudinaryService],
  exports: [UsersService, CloudinaryService], // Exported to be potentially used by other modules
})
export class UsersModule {}
