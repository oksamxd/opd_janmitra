import { Test, TestingModule } from '@nestjs/testing';
import { PublicCasesController } from './public-cases.controller';
import { PublicCasesService } from './public-cases.service';

describe('PublicCasesController', () => {
  let controller: PublicCasesController;

  const mockPublicCasesService = {
    createCase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCasesController],
      providers: [
        { provide: PublicCasesService, useValue: mockPublicCasesService },
      ],
    }).compile();

    controller = module.get<PublicCasesController>(PublicCasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

