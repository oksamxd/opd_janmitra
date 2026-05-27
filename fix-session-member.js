/**
 * One-off script: Backfill member_id + case_id onto existing sessions
 * where they are stored in collected_inputs JSON but not the DB column.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.opd_sessions.findMany({
    where: { is_active: true, member_id: null },
  });

  console.log(`Found ${sessions.length} sessions with null member_id`);
  let fixed = 0;

  for (const session of sessions) {
    const inputs = session.collected_inputs || {};
    const memberId = inputs.memberId;
    const caseId = inputs.caseId;

    if (memberId) {
      await prisma.opd_sessions.update({
        where: { session_id: session.session_id },
        data: {
          ...(memberId ? { member_id: memberId } : {}),
          ...(caseId ? { case_id: caseId } : {}),
        },
      });
      console.log(`  ✅ Fixed session ${session.session_id.slice(-8)} → member: ${memberId.slice(-8)}`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed}/${sessions.length} sessions.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
