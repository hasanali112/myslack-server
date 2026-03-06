import { Test, TestingModule } from '@nestjs/testing';
import { WorkSpaceService } from './work-space.service';

describe('WorkSpaceService', () => {
  let service: WorkSpaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkSpaceService],
    }).compile();

    service = module.get<WorkSpaceService>(WorkSpaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
