import { Test, TestingModule } from '@nestjs/testing';
import { PublicCasesService } from './public-cases.service';
import { PrismaService } from '../prisma.service';

describe('PublicCasesService', () => {
  let service: PublicCasesService;

  const mockPrismaService = {
    cases: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicCasesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PublicCasesService>(PublicCasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

