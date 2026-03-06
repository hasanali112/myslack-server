import { Test, TestingModule } from '@nestjs/testing';
import { WorkSpaceController } from './work-space.controller';
import { WorkSpaceService } from './work-space.service';

describe('WorkSpaceController', () => {
  let controller: WorkSpaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkSpaceController],
      providers: [WorkSpaceService],
    }).compile();

    controller = module.get<WorkSpaceController>(WorkSpaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
