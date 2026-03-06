import { forwardRef, Module } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';
import { AppGateway } from './app.gateway';
import { SocketService } from './socket.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [forwardRef(() => MessagesModule)],
  providers: [WebrtcService, AppGateway, SocketService],
  exports: [WebrtcService, SocketService],
})
export class WebrtcModule {}
