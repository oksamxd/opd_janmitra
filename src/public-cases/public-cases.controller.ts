import { Body, Controller, Post } from '@nestjs/common';
import { PublicCasesService } from './public-cases.service';

@Controller('v1/public')
export class PublicCasesController {

  constructor(private readonly service: PublicCasesService) {}

  @Post('cases')
  createCase(@Body() body: any) {
    return this.service.createCase(body);
  }

}