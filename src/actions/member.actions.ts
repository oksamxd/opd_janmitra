/**
 * Member Actions — Member verification and medical record management
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';

@Injectable()
export class MemberActions {
  private readonly logger = new Logger(MemberActions.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  /**
   * Verify a member by ID. Returns member profile or null.
   */
  async verifyMember(memberId: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) {
      return null;
    }

    const member = await this.prisma.members.findUnique({
      where: { member_id: memberId },
    });

    if (member) {
      await this.audit.log(
        'MEMBER_ACTIONS',
        'VERIFY_MEMBER',
        'members',
        memberId,
        { found: true },
      );
      this.logger.log(`✅ Member verified: ${member.full_name} (${memberId})`);
    } else {
      await this.audit.log(
        'MEMBER_ACTIONS',
        'VERIFY_MEMBER',
        'members',
        memberId,
        { found: false },
      );
      this.logger.warn(`❌ Member not found: ${memberId}`);
    }

    return member;
  }

  /**
   * Verify a member by Phone Number. Returns member profile or null.
   */
  async findMemberByPhone(phone: string) {
    const member = await this.prisma.members.findFirst({
      where: { phone: phone },
    });

    if (member) {
      await this.audit.log(
        'MEMBER_ACTIONS',
        'FIND_MEMBER_BY_PHONE',
        'members',
        member.member_id,
        { phone, found: true },
      );
      this.logger.log(
        `✅ Member found by phone: ${member.full_name} (${phone})`,
      );
    } else {
      await this.audit.log(
        'MEMBER_ACTIONS',
        'FIND_MEMBER_BY_PHONE',
        'members',
        undefined,
        { phone, found: false },
      );
      this.logger.warn(`❌ Member not found by phone: ${phone}`);
    }

    return member;
  }


  /**
   * Get or create a medical record for a member.
   * For now, this sets the medical_record_id field on the member.
   */
  async ensureMedicalRecord(memberId: string) {
    const member = await this.prisma.members.findUnique({
      where: { member_id: memberId },
    });

    if (!member) throw new Error(`Member not found: ${memberId}`);

    if (member.medical_record_id) {
      this.logger.log(
        `Medical record already exists: ${member.medical_record_id}`,
      );
      return {
        memberId,
        medicalRecordId: member.medical_record_id,
        isNew: false,
      };
    }

    // Generate a medical record ID
    const recordId = `MR-${Date.now()}-${memberId.slice(0, 8)}`;

    await this.prisma.members.update({
      where: { member_id: memberId },
      data: { medical_record_id: recordId },
    });

    await this.audit.log(
      'MEMBER_ACTIONS',
      'CREATE_MEDICAL_RECORD',
      'members',
      memberId,
      { medicalRecordId: recordId },
    );
    this.logger.log(`✅ Medical record created: ${recordId}`);

    return { memberId, medicalRecordId: recordId, isNew: true };
  }

  /**
   * Get member profile with related case history.
   */
  async getMemberProfile(memberId: string) {
    return this.prisma.members.findUnique({
      where: { member_id: memberId },
      include: {
        cases: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Create a new member profile and an associated medical record natively.
   */
  async createMemberWithMedicalRecord(data: {
    full_name: string;
    email?: string;
    phone?: string;
    age?: number | null;
    gender?: string;
    height?: string;
    weight?: string;
    blood_group?: string;
  }) {
    const member = await this.prisma.members.create({
      data: {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        medical_record: {
          create: {
            age: data.age,
            height: data.height,
            weight: data.weight,
            blood_group: data.blood_group,
          },
        },
      },
      include: {
        medical_record: true,
      },
    });

    // Retroactively update the member's medical_record_id string column
    // for legacy compatibility if needed
    if (member.medical_record?.record_id) {
      await this.prisma.members.update({
        where: { member_id: member.member_id },
        data: { medical_record_id: member.medical_record.record_id },
      });
    }

    await this.audit.log(
      'MEMBER_ACTIONS',
      'CREATE_MEMBER_WITH_MR',
      'members',
      member.member_id,
      {
        full_name: data.full_name,
        record_id: member.medical_record?.record_id,
      },
    );
    this.logger.log(
      `✅ Member AND Medical Record created: ${member.full_name} (${member.member_id})`,
    );

    return member;
  }
}
