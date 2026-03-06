import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailModule } from 'src/common/utils/email/email.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [EmailModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule {}
