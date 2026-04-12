/**
 * Database Seed — Demo data for Jana AI OPD System
 * 
 * Seeds: doctors, members, slots, services
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── DOCTORS (8 specialties) ────────────────────────────

  const doctors = [
    { full_name: 'Dr. Rajesh Sharma', role: 'DOCTOR', specialty: 'General Medicine', email: 'rajesh.sharma@janaai.com' },
    { full_name: 'Dr. Priya Patel', role: 'DOCTOR', specialty: 'Cardiology', email: 'priya.patel@janaai.com' },
    { full_name: 'Dr. Amit Kumar', role: 'DOCTOR', specialty: 'Orthopedics', email: 'amit.kumar@janaai.com' },
    { full_name: 'Dr. Sneha Reddy', role: 'DOCTOR', specialty: 'Dermatology', email: 'sneha.reddy@janaai.com' },
    { full_name: 'Dr. Vikram Singh', role: 'DOCTOR', specialty: 'ENT', email: 'vikram.singh@janaai.com' },
    { full_name: 'Dr. Anjali Gupta', role: 'DOCTOR', specialty: 'Neurology', email: 'anjali.gupta@janaai.com' },
    { full_name: 'Dr. Sanjay Verma', role: 'DOCTOR', specialty: 'Pediatrics', email: 'sanjay.verma@janaai.com' },
    { full_name: 'Dr. Meena Iyer', role: 'DOCTOR', specialty: 'Gynecology', email: 'meena.iyer@janaai.com' },
    { full_name: 'Dr. Deepak Joshi', role: 'DOCTOR', specialty: 'Gastroenterology', email: 'deepak.joshi@janaai.com' },
    { full_name: 'Dr. Kavita Nair', role: 'DOCTOR', specialty: 'Endocrinology', email: 'kavita.nair@janaai.com' },
  ];

  const createdDoctors: any[] = [];
  for (const doc of doctors) {
    const existing = await prisma.associates.findFirst({ where: { email: doc.email } });
    if (existing) {
      createdDoctors.push(existing);
      console.log(`  ⏩ Doctor exists: ${doc.full_name}`);
    } else {
      const created = await prisma.associates.create({ data: doc });
      createdDoctors.push(created);
      console.log(`  ✅ Created doctor: ${doc.full_name} (${doc.specialty})`);
    }
  }

  // ─── MEMBERS (3 test members) ───────────────────────────

  const members = [
    { full_name: 'Aarav Mehta', email: 'aarav@test.com', phone: '+91-9876543210', address: '42 MG Road, Mumbai, Maharashtra 400001' },
    { full_name: 'Diya Sharma', email: 'diya@test.com', phone: '+91-9876543211', address: '15 Anna Nagar, Chennai, Tamil Nadu 600040' },
    { full_name: 'Kabir Singh', email: 'kabir@test.com', phone: '+91-9876543212', address: '88 Connaught Place, New Delhi 110001' },
  ];

  const createdMembers: any[] = [];
  for (const member of members) {
    const existing = await prisma.members.findFirst({ where: { email: member.email } });
    if (existing) {
      createdMembers.push(existing);
      console.log(`  ⏩ Member exists: ${member.full_name}`);
    } else {
      const created = await prisma.members.create({ data: member });
      createdMembers.push(created);
      console.log(`  ✅ Created member: ${member.full_name}`);
    }
  }

  // ─── SLOTS (3 future slots per doctor) ──────────────────

  console.log('\n📅 Creating availability slots...\n');

  // Clear existing unbooked slots first to refresh the schedule
  await prisma.doctor_availability.deleteMany({ where: { is_booked: false } });

  // 9 AM to 5 PM hourly (9, 10, 11, 12, 13, 14, 15, 16, 17)
  const timeOffsets = [9, 10, 11, 12, 13, 14, 15, 16, 17]; 

  for (const doctor of createdDoctors) {
    // Create slots for the next 7 days
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      for (const hour of timeOffsets) {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        date.setHours(hour, 0, 0, 0); 

        const endDate = new Date(date);
        endDate.setMinutes(endDate.getMinutes() + 30);

        await prisma.doctor_availability.create({
          data: {
            doctor_id: doctor.associate_id,
            date: date,
            start_time: date,
            end_time: endDate,
            is_booked: false,
          },
        });
      }
    }
    console.log(`  ✅ Created ${7 * timeOffsets.length} slots for: ${doctor.full_name}`);
  }

  // ─── SERVICES ───────────────────────────────────────────

  const services = [
    { service_name: 'OPD Consultation', description: 'Outpatient Department Consultation' },
    { service_name: 'Lab Test', description: 'Diagnostic Laboratory Tests' },
    { service_name: 'Specialist Referral', description: 'Specialist Doctor Referral' },
    { service_name: 'Pharmacy Delivery', description: 'Medicine Home Delivery' },
  ];

  for (const svc of services) {
    const existing = await prisma.services.findFirst({ where: { service_name: svc.service_name } });
    if (!existing) {
      await prisma.services.create({ data: svc });
      console.log(`  ✅ Created service: ${svc.service_name}`);
    }
  }

  // ─── SUMMARY ────────────────────────────────────────────

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 Seed complete!\n');
  console.log(`  👨‍⚕️ Doctors:  ${createdDoctors.length}`);
  console.log(`  👤 Members:  ${createdMembers.length}`);
  console.log(`  📅 Slots:    ${createdDoctors.length * 3}`);
  console.log(`  🏥 Services: ${services.length}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Test Member IDs (use these in the chat):');
  for (const m of createdMembers) {
    console.log(`  • ${m.full_name}: ${m.member_id}`);
  }
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
