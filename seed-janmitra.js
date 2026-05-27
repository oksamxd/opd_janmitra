const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ── 1. Janmitra Associates ─────────────────────────────────────────────────
  const existing = await prisma.janmitra_associates.count();
  if (existing === 0) {
    await prisma.janmitra_associates.createMany({
      data: [
        { full_name: 'Priya Sharma',  role: 'Janmitra Associate', phone: '+91-9876543210', is_available: true },
        { full_name: 'Rahul Verma',   role: 'Janmitra Associate', phone: '+91-9876543211', is_available: true },
        { full_name: 'Anjali Singh',  role: 'Senior Janmitra',    phone: '+91-9876543212', is_available: true },
      ]
    });
    console.log('✅ Seeded 3 Janmitra associates');
  } else {
    console.log('ℹ️  Janmitra associates already exist:', existing);
  }

  // ── 2. Sample Notifications ────────────────────────────────────────────────
  // Attach to the first available member + session if they exist.
  const member  = await prisma.members.findFirst({ orderBy: { created_at: 'desc' } });
  const session = await prisma.opd_sessions.findFirst({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
  });
  const activeCase = await prisma.cases.findFirst({
    where: session?.case_id ? { case_id: session.case_id } : undefined,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const sampleNotifications = [
    {
      member_id:  member?.member_id  || null,
      case_id:    activeCase?.case_id || null,
      session_id: session?.session_id || null,
      type:    'APPOINTMENT_REMINDER',
      title:   '📅 Appointment Confirmed',
      message: `Your appointment with Dr. Anand Mehta is scheduled for tomorrow at 10:00 AM. Please arrive 10 minutes early and carry your ID.`,
      status:  'PENDING',
      scheduled_at: tomorrow,
    },
    {
      member_id:  member?.member_id  || null,
      case_id:    activeCase?.case_id || null,
      session_id: session?.session_id || null,
      type:    'TEST_REMINDER',
      title:   '🔬 Diagnostic Tests Scheduled',
      message: `Your blood panel and CBC tests are scheduled for tomorrow morning at 9:00 AM at Jana Diagnostics. Stay fasted from midnight.`,
      status:  'PENDING',
      scheduled_at: tomorrow,
    },
    {
      member_id:  member?.member_id  || null,
      case_id:    activeCase?.case_id || null,
      session_id: session?.session_id || null,
      type:    'DELIVERY_UPDATE',
      title:   '🚚 Medicine Dispatch Confirmed',
      message: `Your prescribed medicines (Paracetamol 500mg, Vitamin D3) have been dispatched. Expected delivery within 2 hours.`,
      status:  'PENDING',
    },
    {
      member_id:  member?.member_id  || null,
      case_id:    activeCase?.case_id || null,
      session_id: session?.session_id || null,
      type:    'FOLLOWUP_REMINDER',
      title:   '🔁 Follow-up Reminder',
      message: `Your follow-up teleconsultation with Dr. Anand Mehta is scheduled for next Monday at 11:00 AM. No change in case ID.`,
      status:  'READ',
    },
    {
      member_id:  member?.member_id  || null,
      case_id:    activeCase?.case_id || null,
      session_id: session?.session_id || null,
      type:    'HANDOFF',
      title:   '👨‍💼 Janmitra Associate Assisted',
      message: `Priya Sharma (Janmitra Associate) successfully completed your appointment booking. AI has resumed control.`,
      status:  'READ',
    },
  ];

  const notifCount = await prisma.notifications.count({
    where: session?.session_id ? { session_id: session.session_id } : {},
  });

  if (notifCount === 0) {
    await prisma.notifications.createMany({ data: sampleNotifications });
    console.log(`✅ Seeded ${sampleNotifications.length} sample notifications`);
  } else {
    console.log(`ℹ️  Notifications already exist for this session: ${notifCount}`);
  }

  // ── 3. Doctor Availability Slots (Dynamic Future Dates) ──────────────────
  const doctors = await prisma.associates.findMany({ where: { role: 'DOCTOR' } });
  
  if (doctors.length > 0) {
    const slots = [];
    const now = new Date();
    
    for (const doc of doctors) {
      // Check if slots already exist for this doctor
      const slotCount = await prisma.doctor_availability.count({ where: { doctor_id: doc.associate_id } });
      if (slotCount > 0) continue;

      console.log(`⏳ Generating slots for ${doc.full_name}...`);
      
      // Generate slots for the next 3 days
      for (let day = 0; day < 3; day++) {
        const baseDate = new Date(now);
        baseDate.setDate(now.getDate() + day);
        
        // 4 slots per day: 10 AM, 11 AM, 2 PM, 3 PM
        const hours = [10, 11, 14, 15];
        for (const hour of hours) {
          const startTime = new Date(baseDate);
          startTime.setHours(hour, 0, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setHours(hour + 1, 0, 0, 0);

          // Only add if in the future
          if (startTime > now) {
            slots.push({
              doctor_id:  doc.associate_id,
              date:       baseDate,
              start_time: startTime,
              end_time:   endTime,
              is_booked:  false
            });
          }
        }
      }
    }

    if (slots.length > 0) {
      await prisma.doctor_availability.createMany({ data: slots });
      console.log(`✅ Seeded ${slots.length} available slots across ${doctors.length} doctors`);
    } else {
      console.log('ℹ️  Doctor slots already exist or no future slots needed.');
    }
  }

  console.log('');
  console.log('📊 Seed Summary:');
  console.log('   Member  :', member?.full_name || '(none — run a session first)');
  console.log('   Session :', session?.session_id?.slice(-8) || '(none)');
  console.log('   Case    :', activeCase?.case_id?.slice(-8) || '(none)');
  console.log('   Doctors :', doctors.length);
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

