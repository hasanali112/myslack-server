import { Module, forwardRef } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { WebrtcModule } from '../webrtc/webrtc.module';

@Module({
  imports: [forwardRef(() => WebrtcModule)],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
