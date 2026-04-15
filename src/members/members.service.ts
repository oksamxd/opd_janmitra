import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './member.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  create(data: Partial<Member>) {
    return this.memberRepository.save(data);
  }

  findAll() {
    return this.memberRepository.find();
  }
}