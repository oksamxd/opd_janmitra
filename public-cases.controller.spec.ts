import { Test, TestingModule } from '@nestjs/testing';
import { PublicCasesController } from './public-cases.controller';

describe('PublicCasesController', () => {
  let controller: PublicCasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCasesController],
    }).compile();

    controller = module.get<PublicCasesController>(PublicCasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
