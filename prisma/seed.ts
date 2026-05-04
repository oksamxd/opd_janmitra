/**
 * Database Seed — Demo data for Jana AI OPD System
 * 
 * Seeds: doctors, members, slots (30 days), services
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── DOCTORS (10 specialties) ────────────────────────────

  const doctors = [
    { full_name: 'Dr. Rajesh Sharma',  role: 'DOCTOR', specialty: 'General Medicine',    email: 'rajesh.sharma@janaai.com' },
    { full_name: 'Dr. Priya Patel',    role: 'DOCTOR', specialty: 'Cardiology',           email: 'priya.patel@janaai.com' },
    { full_name: 'Dr. Amit Kumar',     role: 'DOCTOR', specialty: 'Orthopedics',          email: 'amit.kumar@janaai.com' },
    { full_name: 'Dr. Sneha Reddy',    role: 'DOCTOR', specialty: 'Dermatology',          email: 'sneha.reddy@janaai.com' },
    { full_name: 'Dr. Vikram Singh',   role: 'DOCTOR', specialty: 'ENT',                  email: 'vikram.singh@janaai.com' },
    { full_name: 'Dr. Anjali Gupta',   role: 'DOCTOR', specialty: 'Neurology',            email: 'anjali.gupta@janaai.com' },
    { full_name: 'Dr. Sanjay Verma',   role: 'DOCTOR', specialty: 'Pediatrics',           email: 'sanjay.verma@janaai.com' },
    { full_name: 'Dr. Meena Iyer',     role: 'DOCTOR', specialty: 'Gynecology',           email: 'meena.iyer@janaai.com' },
    { full_name: 'Dr. Deepak Joshi',   role: 'DOCTOR', specialty: 'Gastroenterology',     email: 'deepak.joshi@janaai.com' },
    { full_name: 'Dr. Kavita Nair',    role: 'DOCTOR', specialty: 'Endocrinology',        email: 'kavita.nair@janaai.com' },
    { full_name: 'Dr. Arjun Mehta',    role: 'DOCTOR', specialty: 'Pulmonology',          email: 'arjun.mehta@janaai.com' },
    { full_name: 'Dr. Ritu Agarwal',   role: 'DOCTOR', specialty: 'Ophthalmology',        email: 'ritu.agarwal@janaai.com' },
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

  // ─── MEMBERS (5 test members) ───────────────────────────

  const members = [
    { full_name: 'Aarav Mehta',   email: 'aarav@test.com',   phone: '+91-9876543210', address: '42 MG Road, Mumbai, Maharashtra 400001' },
    { full_name: 'Diya Sharma',   email: 'diya@test.com',    phone: '+91-9876543211', address: '15 Anna Nagar, Chennai, Tamil Nadu 600040' },
    { full_name: 'Kabir Singh',   email: 'kabir@test.com',   phone: '+91-9876543212', address: '88 Connaught Place, New Delhi 110001' },
    { full_name: 'Priya Nair',    email: 'priya@test.com',   phone: '+91-9876543213', address: '12 Park Street, Kolkata, West Bengal 700016' },
    { full_name: 'Rohan Verma',   email: 'rohan@test.com',   phone: '+91-9876543214', address: '7 Jubilee Hills, Hyderabad, Telangana 500033' },
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

  // ─── AVAILABILITY SLOTS (30 days, Mon–Sat) ──────────────────
  // Slots: 9 AM – 5 PM, 30-minute blocks, skip Sundays

  console.log('\n📅 Creating availability slots for 30 days...\n');

  // Clear existing unbooked slots to refresh
  const deleted = await prisma.doctor_availability.deleteMany({ where: { is_booked: false } });
  console.log(`  🗑️  Cleared ${deleted.count} old unbooked slots\n`);

  // Morning: 9, 10, 11 | Afternoon: 14, 15, 16 | Evening: 17
  // Doctors have different working hours by specialty
  const scheduleMap: Record<string, number[]> = {
    'General Medicine':    [9, 10, 11, 12, 14, 15, 16, 17],
    'Cardiology':          [9, 10, 11, 14, 15],
    'Orthopedics':         [10, 11, 12, 14, 15, 16],
    'Dermatology':         [10, 11, 12, 14, 15, 16, 17],
    'ENT':                 [9, 10, 11, 14, 15, 16],
    'Neurology':           [9, 10, 11, 14, 15],
    'Pediatrics':          [9, 10, 11, 14, 15, 16, 17],
    'Gynecology':          [9, 10, 11, 14, 15, 16],
    'Gastroenterology':    [10, 11, 12, 14, 15],
    'Endocrinology':       [9, 10, 11, 14, 15],
    'Pulmonology':         [9, 10, 11, 14, 15, 16],
    'Ophthalmology':       [10, 11, 12, 14, 15, 16],
  };

  let totalSlotsCreated = 0;

  for (const doctor of createdDoctors) {
    const hours = scheduleMap[doctor.specialty] ?? [9, 10, 11, 14, 15, 16];
    const slotsToCreate: any[] = [];

    // Generate slots for the next 30 days
    for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      // Skip Sundays (day 0)
      if (date.getDay() === 0) continue;

      for (const hour of hours) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);

        slotsToCreate.push({
          doctor_id:  doctor.associate_id,
          date:       date,
          start_time: startTime,
          end_time:   endTime,
          is_booked:  false,
        });
      }
    }

    // Batch insert
    await prisma.doctor_availability.createMany({ data: slotsToCreate });
    totalSlotsCreated += slotsToCreate.length;
    console.log(`  ✅ ${slotsToCreate.length} slots created for: ${doctor.full_name} (${doctor.specialty})`);
  }

  // ─── SERVICES ───────────────────────────────────────────

  const services = [
    { service_name: 'OPD Consultation',   description: 'Outpatient Department Consultation' },
    { service_name: 'Lab Test',            description: 'Diagnostic Laboratory Tests' },
    { service_name: 'Specialist Referral', description: 'Specialist Doctor Referral' },
    { service_name: 'Pharmacy Delivery',   description: 'Medicine Home Delivery' },
  ];

  for (const svc of services) {
    const existing = await prisma.services.findFirst({ where: { service_name: svc.service_name } });
    if (!existing) {
      await prisma.services.create({ data: svc });
      console.log(`  ✅ Created service: ${svc.service_name}`);
    }
  }

  // ─── JANMITRA ASSOCIATES ────────────────────────────────

  const janmitraTeam = [
    { full_name: 'Priya Sharma',  role: 'Janmitra Associate', phone: '+91-9876543210', is_available: true },
    { full_name: 'Rahul Verma',   role: 'Janmitra Associate', phone: '+91-9876543211', is_available: true },
    { full_name: 'Anjali Singh',  role: 'Senior Janmitra',    phone: '+91-9876543212', is_available: true },
    { full_name: 'Suresh Pillai', role: 'Janmitra Associate', phone: '+91-9876543213', is_available: false },
    { full_name: 'Geeta Kumari',  role: 'Senior Janmitra',    phone: '+91-9876543214', is_available: true },
  ];

  const existingJanmitra = await prisma.janmitra_associates.count();
  if (existingJanmitra === 0) {
    await prisma.janmitra_associates.createMany({ data: janmitraTeam });
    console.log(`\n  ✅ Created ${janmitraTeam.length} Janmitra associates`);
  } else {
    console.log(`\n  ⏩ Janmitra associates already exist: ${existingJanmitra}`);
  }

  // ─── SUMMARY ────────────────────────────────────────────

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 Seed complete!\n');
  console.log(`  👨‍⚕️ Doctors:       ${createdDoctors.length}`);
  console.log(`  👤 Members:       ${createdMembers.length}`);
  console.log(`  📅 Slots created: ${totalSlotsCreated} (30 days, Mon–Sat)`);
  console.log(`  🏥 Services:      ${services.length}`);
  console.log(`  🤝 Janmitra:      ${janmitraTeam.length}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
