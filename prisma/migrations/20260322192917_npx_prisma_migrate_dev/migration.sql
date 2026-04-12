/*
  Warnings:

  - You are about to drop the column `verification_status` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `verified_at` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `closed_at` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `completion_notes` on the `episode_steps` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `area` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_admin` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `mobile` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `occupation_group` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `occupation_type` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otp_expires_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_expires_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `push_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verification_otp` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `zipcode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `ai_escalations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_prompt_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coupon_codes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coupon_redemptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `discount_campaigns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `join_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_base_articles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `membership_tiers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `programs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sponsors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_organizations` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `jana_response` on the `ai_interactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `created_at` on table `associates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `cases` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `members` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ai_escalations" DROP CONSTRAINT "ai_escalations_interaction_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_interactions" DROP CONSTRAINT "ai_interactions_case_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_interactions" DROP CONSTRAINT "ai_interactions_episode_id_fkey";

-- DropForeignKey
ALTER TABLE "case_documents" DROP CONSTRAINT "case_documents_case_id_fkey";

-- DropForeignKey
ALTER TABLE "case_status_history" DROP CONSTRAINT "case_status_history_case_id_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_associate_id_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_member_id_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_service_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_codes" DROP CONSTRAINT "coupon_codes_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_coupon_code_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "discount_campaigns" DROP CONSTRAINT "discount_campaigns_sponsor_id_fkey";

-- DropForeignKey
ALTER TABLE "episode_steps" DROP CONSTRAINT "episode_steps_episode_id_fkey";

-- DropForeignKey
ALTER TABLE "episode_steps" DROP CONSTRAINT "episode_steps_service_step_id_fkey";

-- DropForeignKey
ALTER TABLE "episodes" DROP CONSTRAINT "episodes_case_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "join_requests" DROP CONSTRAINT "join_requests_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "join_requests" DROP CONSTRAINT "join_requests_user_id_fkey";

-- DropForeignKey
ALTER TABLE "membership_tiers" DROP CONSTRAINT "membership_tiers_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_organization_type_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "service_steps" DROP CONSTRAINT "service_steps_service_id_fkey";

-- DropForeignKey
ALTER TABLE "sponsors" DROP CONSTRAINT "sponsors_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "user_events" DROP CONSTRAINT "user_events_event_id_fkey";

-- DropForeignKey
ALTER TABLE "user_events" DROP CONSTRAINT "user_events_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_organizations" DROP CONSTRAINT "user_organizations_membership_tier_id_fkey";

-- DropForeignKey
ALTER TABLE "user_organizations" DROP CONSTRAINT "user_organizations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "user_organizations" DROP CONSTRAINT "user_organizations_user_id_fkey";

-- DropIndex
DROP INDEX "idx_ai_case";

-- DropIndex
DROP INDEX "members_email_key";

-- DropIndex
DROP INDEX "users_mobile_key";

-- DropIndex
DROP INDEX "users_password_reset_token_key";

-- DropIndex
DROP INDEX "users_push_token_key";

-- AlterTable
ALTER TABLE "ai_interactions" DROP COLUMN "jana_response",
ADD COLUMN     "jana_response" JSONB NOT NULL,
ALTER COLUMN "language" SET DATA TYPE TEXT,
ALTER COLUMN "confidence_score" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "associates" ALTER COLUMN "full_name" SET DATA TYPE TEXT,
ALTER COLUMN "role" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "case_documents" DROP COLUMN "verification_status",
DROP COLUMN "verified_at",
ALTER COLUMN "document_type" SET DATA TYPE TEXT,
ALTER COLUMN "uploaded_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "case_status_history" ALTER COLUMN "old_status" SET DATA TYPE TEXT,
ALTER COLUMN "new_status" SET DATA TYPE TEXT,
ALTER COLUMN "changed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cases" DROP COLUMN "closed_at",
DROP COLUMN "priority",
DROP COLUMN "updated_at",
ADD COLUMN     "members_member_id" UUID,
ADD COLUMN     "services_service_id" UUID,
ALTER COLUMN "member_id" SET DATA TYPE TEXT,
ALTER COLUMN "service_id" SET DATA TYPE TEXT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "episode_steps" DROP COLUMN "completion_notes",
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "episodes" ALTER COLUMN "episode_type" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "members" ALTER COLUMN "full_name" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "service_steps" ALTER COLUMN "step_name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "created_at",
DROP COLUMN "is_active",
ALTER COLUMN "service_name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "area",
DROP COLUMN "is_active",
DROP COLUMN "is_admin",
DROP COLUMN "is_verified",
DROP COLUMN "mobile",
DROP COLUMN "occupation_group",
DROP COLUMN "occupation_type",
DROP COLUMN "otp_expires_at",
DROP COLUMN "password_hash",
DROP COLUMN "password_reset_expires_at",
DROP COLUMN "password_reset_token",
DROP COLUMN "push_token",
DROP COLUMN "role",
DROP COLUMN "updated_at",
DROP COLUMN "verification_otp",
DROP COLUMN "zipcode",
ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "ai_escalations";

-- DropTable
DROP TABLE "ai_prompt_templates";

-- DropTable
DROP TABLE "coupon_codes";

-- DropTable
DROP TABLE "coupon_redemptions";

-- DropTable
DROP TABLE "discount_campaigns";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "join_requests";

-- DropTable
DROP TABLE "knowledge_base_articles";

-- DropTable
DROP TABLE "membership_tiers";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "organization_types";

-- DropTable
DROP TABLE "organizations";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "programs";

-- DropTable
DROP TABLE "sponsors";

-- DropTable
DROP TABLE "user_events";

-- DropTable
DROP TABLE "user_organizations";

-- CreateTable
CREATE TABLE "case_services" (
    "case_service_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "service_name" TEXT NOT NULL,
    "service_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider_id" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_services_pkey" PRIMARY KEY ("case_service_id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "service_id" UUID,
    "event_type" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "doctor_availability" (
    "availability_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateIndex
CREATE INDEX "case_services_case_id_idx" ON "case_services"("case_id");

-- CreateIndex
CREATE INDEX "case_services_status_idx" ON "case_services"("status");

-- CreateIndex
CREATE INDEX "case_events_case_id_idx" ON "case_events"("case_id");

-- CreateIndex
CREATE INDEX "doctor_availability_doctor_id_idx" ON "doctor_availability"("doctor_id");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("associate_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_members_member_id_fkey" FOREIGN KEY ("members_member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_services_service_id_fkey" FOREIGN KEY ("services_service_id") REFERENCES "services"("service_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_services" ADD CONSTRAINT "case_services_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("episode_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_steps" ADD CONSTRAINT "episode_steps_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("episode_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_steps" ADD CONSTRAINT "episode_steps_service_step_id_fkey" FOREIGN KEY ("service_step_id") REFERENCES "service_steps"("service_step_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_steps" ADD CONSTRAINT "service_steps_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_cases_member" RENAME TO "cases_member_id_idx";

-- RenameIndex
ALTER INDEX "idx_cases_status" RENAME TO "cases_status_idx";

-- RenameIndex
ALTER INDEX "idx_episodes_case" RENAME TO "episodes_case_id_idx";
