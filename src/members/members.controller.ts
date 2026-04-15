import { Controller, Get, Post, Body } from '@nestjs/common';
import { MembersService } from './members.service';
import { Member } from './member.entity';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  create(@Body() body: Partial<Member>) {
    return this.membersService.create(body);
  }

  @Get()
  findAll() {
    return this.membersService.findAll();
  }
}