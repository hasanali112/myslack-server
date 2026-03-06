import { Module } from '@nestjs/common';
import { WorkSpaceService } from './work-space.service';
import { WorkSpaceController } from './work-space.controller';

@Module({
  controllers: [WorkSpaceController],
  providers: [WorkSpaceService],
})
export class WorkSpaceModule {}
