import { Module } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';
import { WebrtcGateway } from './webrtc.getway';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WebrtcService, WebrtcGateway],
  exports: [WebrtcService],
})
export class WebrtcModule {}
