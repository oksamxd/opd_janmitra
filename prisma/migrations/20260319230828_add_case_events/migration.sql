-- CreateTable
CREATE TABLE "ai_escalations" (
    "escalation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interaction_id" UUID NOT NULL,
    "escalation_reason" TEXT,
    "status" VARCHAR(30) DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(6),

    CONSTRAINT "ai_escalations_pkey" PRIMARY KEY ("escalation_id")
);

-- CreateTable
CREATE TABLE "ai_interactions" (
    "interaction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID,
    "episode_id" UUID,
    "user_query" TEXT NOT NULL,
    "jana_response" TEXT NOT NULL,
    "language" VARCHAR(10) DEFAULT 'EN',
    "confidence_score" DECIMAL(5,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("interaction_id")
);

-- CreateTable
CREATE TABLE "ai_prompt_templates" (
    "template_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "system_prompt" TEXT NOT NULL,
    "user_prompt_template" TEXT,
    "language" VARCHAR(10) DEFAULT 'EN',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "associates" (
    "associate_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "role" VARCHAR(50),
    "email" VARCHAR(150),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "associates_pkey" PRIMARY KEY ("associate_id")
);

-- CreateTable
CREATE TABLE "case_documents" (
    "document_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" VARCHAR(50),
    "verification_status" VARCHAR(30) DEFAULT 'PENDING',
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(6),

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "case_status_history" (
    "history_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "old_status" VARCHAR(30),
    "new_status" VARCHAR(30),
    "changed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "case_status_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "cases" (
    "case_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "associate_id" UUID,
    "service_id" UUID NOT NULL,
    "status" VARCHAR(30) DEFAULT 'OPEN',
    "priority" VARCHAR(20) DEFAULT 'NORMAL',
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(6),

    CONSTRAINT "cases_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "coupon_codes" (
    "id" UUID NOT NULL,
    "campaign_id" UUID,
    "code" TEXT,
    "max_uses" INTEGER DEFAULT 1,
    "current_uses" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_code_id" UUID,
    "user_id" INTEGER,
    "original_cost" DOUBLE PRECISION,
    "discount_amount" DOUBLE PRECISION,
    "amount_paid" DOUBLE PRECISION,
    "currency" TEXT,
    "item_type" TEXT,
    "item_id" TEXT,
    "redeemed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_campaigns" (
    "id" UUID NOT NULL,
    "sponsor_id" UUID,
    "name" TEXT,
    "discount_type" TEXT,
    "discount_value" DOUBLE PRECISION,
    "currency" TEXT,
    "target_type" TEXT,
    "target_id" TEXT,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "max_total_uses" INTEGER,
    "current_total_uses" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_steps" (
    "episode_step_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "service_step_id" UUID NOT NULL,
    "status" VARCHAR(30) DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "completion_notes" TEXT,

    CONSTRAINT "episode_steps_pkey" PRIMARY KEY ("episode_step_id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "episode_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "episode_type" VARCHAR(50),
    "status" VARCHAR(30) DEFAULT 'PENDING',
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "notes" TEXT,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("episode_id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "name" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "start_datetime" TIMESTAMP(6),
    "end_datetime" TIMESTAMP(6),
    "type" TEXT,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "google_maps_url" TEXT,
    "online_url" TEXT,
    "agenda" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "dress_code" TEXT,
    "join_type" TEXT,
    "cost" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "organization_id" UUID,
    "status" TEXT DEFAULT 'pending',
    "requested_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_articles" (
    "article_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "content" TEXT NOT NULL,
    "language" VARCHAR(10) DEFAULT 'EN',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_articles_pkey" PRIMARY KEY ("article_id")
);

-- CreateTable
CREATE TABLE "members" (
    "member_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "membership_tiers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT,
    "display_name" TEXT,
    "description" TEXT,
    "cost" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'INR',

    CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "organization_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eligibility" TEXT,
    "join_type" TEXT,
    "cost" DOUBLE PRECISION,
    "logo_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "is_default" BOOLEAN DEFAULT false,
    "organization_type_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_type" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "stripe_session_id" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "eligibility" TEXT,
    "category" TEXT,
    "organization_id" UUID,
    "image_url" TEXT,
    "join_type" TEXT,
    "payment_timing" TEXT,
    "cost" DOUBLE PRECISION,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_steps" (
    "service_step_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "step_name" VARCHAR(150) NOT NULL,
    "step_order" INTEGER,

    CONSTRAINT "service_steps_pkey" PRIMARY KEY ("service_step_id")
);

-- CreateTable
CREATE TABLE "services" (
    "service_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "name" TEXT,
    "description" TEXT,
    "is_internal" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_events" (
    "user_id" INTEGER NOT NULL,
    "event_id" UUID NOT NULL,
    "registered_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("user_id","event_id")
);

-- CreateTable
CREATE TABLE "user_organizations" (
    "user_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "membership_tier_id" UUID,
    "payment_status" TEXT DEFAULT 'pending',
    "joined_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT DEFAULT 'MEMBER',

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("user_id","organization_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "push_token" TEXT,
    "is_verified" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "verification_otp" TEXT,
    "otp_expires_at" TIMESTAMP(6),
    "password_reset_token" TEXT,
    "password_reset_expires_at" TIMESTAMP(6),
    "zipcode" TEXT,
    "area" TEXT,
    "occupation_group" TEXT,
    "occupation_type" TEXT,
    "is_admin" BOOLEAN DEFAULT false,
    "role" TEXT DEFAULT 'USER',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ai_case" ON "ai_interactions"("case_id");

-- CreateIndex
CREATE INDEX "idx_cases_member" ON "cases"("member_id");

-- CreateIndex
CREATE INDEX "idx_cases_status" ON "cases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_codes_code_key" ON "coupon_codes"("code");

-- CreateIndex
CREATE INDEX "idx_episodes_case" ON "episodes"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "join_requests_user_id_organization_id_key" ON "join_requests"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_types_name_key" ON "organization_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_push_token_key" ON "users"("push_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_password_reset_token_key" ON "users"("password_reset_token");

-- AddForeignKey
ALTER TABLE "ai_escalations" ADD CONSTRAINT "ai_escalations_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "ai_interactions"("interaction_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("episode_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("associate_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "discount_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_code_id_fkey" FOREIGN KEY ("coupon_code_id") REFERENCES "coupon_codes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "discount_campaigns" ADD CONSTRAINT "discount_campaigns_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode_steps" ADD CONSTRAINT "episode_steps_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("episode_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode_steps" ADD CONSTRAINT "episode_steps_service_step_id_fkey" FOREIGN KEY ("service_step_id") REFERENCES "service_steps"("service_step_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_tiers" ADD CONSTRAINT "membership_tiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_organization_type_id_fkey" FOREIGN KEY ("organization_type_id") REFERENCES "organization_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_steps" ADD CONSTRAINT "service_steps_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_membership_tier_id_fkey" FOREIGN KEY ("membership_tier_id") REFERENCES "membership_tiers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
