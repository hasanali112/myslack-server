import { Controller } from '@nestjs/common';
import { WorkSpaceService } from './work-space.service';

@Controller('work-space')
export class WorkSpaceController {
  constructor(private readonly workSpaceService: WorkSpaceService) {}
}
