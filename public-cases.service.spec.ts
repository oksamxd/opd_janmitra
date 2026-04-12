import { Test, TestingModule } from '@nestjs/testing';
import { PublicCasesService } from './public-cases.service';

describe('PublicCasesService', () => {
  let service: PublicCasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicCasesService],
    }).compile();

    service = module.get<PublicCasesService>(PublicCasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
