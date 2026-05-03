-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN     "session_id" TEXT,
ALTER COLUMN "case_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "case_events" ADD COLUMN     "session_id" TEXT,
ALTER COLUMN "case_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "opd_sessions" ADD COLUMN     "controlled_by" TEXT NOT NULL DEFAULT 'AI',
ADD COLUMN     "janmitra_id" UUID,
ADD COLUMN     "language_preference" TEXT NOT NULL DEFAULT 'English';

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID,
    "case_id" UUID,
    "session_id" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "opd_visits" (
    "visit_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "visit_type" TEXT NOT NULL DEFAULT 'FOLLOWUP',
    "appointment_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opd_visits_pkey" PRIMARY KEY ("visit_id")
);

-- CreateTable
CREATE TABLE "janmitra_associates" (
    "janmitra_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Janmitra Associate',
    "phone" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "janmitra_associates_pkey" PRIMARY KEY ("janmitra_id")
);

-- CreateIndex
CREATE INDEX "notifications_member_id_idx" ON "notifications"("member_id");

-- CreateIndex
CREATE INDEX "notifications_session_id_idx" ON "notifications"("session_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_case_id_idx" ON "notifications"("case_id");

-- CreateIndex
CREATE INDEX "opd_visits_case_id_idx" ON "opd_visits"("case_id");

-- CreateIndex
CREATE INDEX "opd_visits_status_idx" ON "opd_visits"("status");

-- CreateIndex
CREATE INDEX "janmitra_associates_is_available_idx" ON "janmitra_associates"("is_available");

-- CreateIndex
CREATE INDEX "case_events_session_id_idx" ON "case_events"("session_id");

-- CreateIndex
CREATE INDEX "opd_sessions_controlled_by_idx" ON "opd_sessions"("controlled_by");
