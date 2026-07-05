CREATE EXTENSION IF NOT EXISTS vector;
-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "deploy_mode" TEXT NOT NULL,
    "model_policy" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "github_repo" TEXT NOT NULL,
    "github_installation_id" BIGINT NOT NULL,
    "settings" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_profile" (
    "id" UUID NOT NULL,
    "project_id" UUID,
    "name" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "token_budget_default" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agent_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignment" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "agent_profile_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role_global" TEXT NOT NULL,
    "sso_subject" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_member" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "raw_input" TEXT NOT NULL,
    "source_channel" TEXT NOT NULL,
    "github_issue_number" INTEGER,
    "pathway" TEXT NOT NULL,
    "pathway_confidence" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "complexity_score" SMALLINT NOT NULL,
    "risk_score" SMALLINT NOT NULL,
    "ai_readiness" REAL NOT NULL,
    "effort_estimate" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "gate_a_by" UUID,
    "gate_a_at" TIMESTAMPTZ(6),
    "customer_ack" JSONB,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarifying_question" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "answer" TEXT,
    "answered_by" UUID,
    "answered_at" TIMESTAMPTZ(6),
    "order_index" INTEGER NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clarifying_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototype" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "branch" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "screens" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "feedback" JSONB,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prototype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breakdown" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "gate_b_by" UUID,
    "gate_b_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement" (
    "id" UUID NOT NULL,
    "breakdown_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact_analysis" JSONB NOT NULL,
    "order_index" INTEGER NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story" (
    "id" UUID NOT NULL,
    "breakdown_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_requirement" (
    "id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "story_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceptance_criterion" (
    "id" UUID NOT NULL,
    "story_id" UUID,
    "unit_of_work_id" UUID,
    "code" TEXT NOT NULL,
    "given_when_then" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acceptance_criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_of_work" (
    "id" UUID NOT NULL,
    "breakdown_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bounded_context" TEXT NOT NULL,
    "interface_contract" JSONB NOT NULL,
    "agent_overrides" JSONB,
    "allowed_paths" TEXT[],
    "status" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "unit_of_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uow_dependency" (
    "id" UUID NOT NULL,
    "uow_id" UUID NOT NULL,
    "depends_on_uow_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "uow_dependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" UUID NOT NULL,
    "unit_of_work_id" UUID,
    "bolt_id" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "definition_of_done" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "flag_reason" TEXT,
    "agent_profile_id" UUID,
    "rework_count" SMALLINT NOT NULL DEFAULT 0,
    "priority" SMALLINT NOT NULL,
    "order_index" SMALLINT NOT NULL,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolt" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bolt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_job" (
    "id" UUID NOT NULL,
    "task_id" UUID,
    "intent_id" UUID,
    "role" TEXT NOT NULL,
    "agent_profile_id" UUID NOT NULL,
    "input_payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "result_payload" JSONB NOT NULL,
    "token_budget" INTEGER NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "cost_usd" DECIMAL(10,4) NOT NULL,
    "self_fix_rounds" SMALLINT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6) NOT NULL,
    "log_ref" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agent_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_review" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "reviewer_job_id" UUID NOT NULL,
    "pr_url" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "confidence" REAL NOT NULL,
    "round" SMALLINT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agent_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attention_item" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "severity" SMALLINT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee_id" UUID,
    "sla_deadline" TIMESTAMPTZ(6) NOT NULL,
    "resolution" JSONB NOT NULL,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attention_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_run" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "gate" TEXT NOT NULL,
    "suite" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "report_url" TEXT NOT NULL,
    "ran_at" TIMESTAMPTZ(6) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "test_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_run_ac" (
    "id" UUID NOT NULL,
    "test_run_id" UUID NOT NULL,
    "acceptance_criterion_id" UUID NOT NULL,
    "covered" BOOLEAN NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "test_run_ac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_call" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "agent_job_id" UUID,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost_usd" DECIMAL(10,6) NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "llm_call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_chunk" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repo_ref" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "summary" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "code_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_project_id_role_key" ON "role_assignment"("project_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_member_project_id_user_id_key" ON "project_member"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "prototype_intent_id_version_key" ON "prototype"("intent_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "breakdown_intent_id_version_key" ON "breakdown"("intent_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_breakdown_id_code_key" ON "requirement"("breakdown_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "story_breakdown_id_code_key" ON "story"("breakdown_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "story_requirement_story_id_requirement_id_key" ON "story_requirement"("story_id", "requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "uow_dependency_uow_id_depends_on_uow_id_key" ON "uow_dependency"("uow_id", "depends_on_uow_id");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_agent_profile_id_fkey" FOREIGN KEY ("agent_profile_id") REFERENCES "agent_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent" ADD CONSTRAINT "intent_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent" ADD CONSTRAINT "intent_gate_a_by_fkey" FOREIGN KEY ("gate_a_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent" ADD CONSTRAINT "intent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifying_question" ADD CONSTRAINT "clarifying_question_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifying_question" ADD CONSTRAINT "clarifying_question_answered_by_fkey" FOREIGN KEY ("answered_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifying_question" ADD CONSTRAINT "clarifying_question_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifying_question" ADD CONSTRAINT "clarifying_question_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype" ADD CONSTRAINT "prototype_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype" ADD CONSTRAINT "prototype_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype" ADD CONSTRAINT "prototype_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakdown" ADD CONSTRAINT "breakdown_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakdown" ADD CONSTRAINT "breakdown_gate_b_by_fkey" FOREIGN KEY ("gate_b_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakdown" ADD CONSTRAINT "breakdown_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakdown" ADD CONSTRAINT "breakdown_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_breakdown_id_fkey" FOREIGN KEY ("breakdown_id") REFERENCES "breakdown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story" ADD CONSTRAINT "story_breakdown_id_fkey" FOREIGN KEY ("breakdown_id") REFERENCES "breakdown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story" ADD CONSTRAINT "story_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story" ADD CONSTRAINT "story_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_requirement" ADD CONSTRAINT "story_requirement_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_requirement" ADD CONSTRAINT "story_requirement_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_requirement" ADD CONSTRAINT "story_requirement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_requirement" ADD CONSTRAINT "story_requirement_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criterion" ADD CONSTRAINT "acceptance_criterion_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criterion" ADD CONSTRAINT "acceptance_criterion_unit_of_work_id_fkey" FOREIGN KEY ("unit_of_work_id") REFERENCES "unit_of_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criterion" ADD CONSTRAINT "acceptance_criterion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criterion" ADD CONSTRAINT "acceptance_criterion_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_of_work" ADD CONSTRAINT "unit_of_work_breakdown_id_fkey" FOREIGN KEY ("breakdown_id") REFERENCES "breakdown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_of_work" ADD CONSTRAINT "unit_of_work_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_of_work" ADD CONSTRAINT "unit_of_work_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uow_dependency" ADD CONSTRAINT "uow_dependency_uow_id_fkey" FOREIGN KEY ("uow_id") REFERENCES "unit_of_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uow_dependency" ADD CONSTRAINT "uow_dependency_depends_on_uow_id_fkey" FOREIGN KEY ("depends_on_uow_id") REFERENCES "unit_of_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uow_dependency" ADD CONSTRAINT "uow_dependency_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uow_dependency" ADD CONSTRAINT "uow_dependency_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_unit_of_work_id_fkey" FOREIGN KEY ("unit_of_work_id") REFERENCES "unit_of_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_bolt_id_fkey" FOREIGN KEY ("bolt_id") REFERENCES "bolt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_agent_profile_id_fkey" FOREIGN KEY ("agent_profile_id") REFERENCES "agent_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolt" ADD CONSTRAINT "bolt_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolt" ADD CONSTRAINT "bolt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_agent_profile_id_fkey" FOREIGN KEY ("agent_profile_id") REFERENCES "agent_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_review" ADD CONSTRAINT "agent_review_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_review" ADD CONSTRAINT "agent_review_reviewer_job_id_fkey" FOREIGN KEY ("reviewer_job_id") REFERENCES "agent_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_review" ADD CONSTRAINT "agent_review_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_review" ADD CONSTRAINT "agent_review_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attention_item" ADD CONSTRAINT "attention_item_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attention_item" ADD CONSTRAINT "attention_item_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attention_item" ADD CONSTRAINT "attention_item_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attention_item" ADD CONSTRAINT "attention_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_ac" ADD CONSTRAINT "test_run_ac_test_run_id_fkey" FOREIGN KEY ("test_run_id") REFERENCES "test_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_ac" ADD CONSTRAINT "test_run_ac_acceptance_criterion_id_fkey" FOREIGN KEY ("acceptance_criterion_id") REFERENCES "acceptance_criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_ac" ADD CONSTRAINT "test_run_ac_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_ac" ADD CONSTRAINT "test_run_ac_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_call" ADD CONSTRAINT "llm_call_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_call" ADD CONSTRAINT "llm_call_agent_job_id_fkey" FOREIGN KEY ("agent_job_id") REFERENCES "agent_job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_call" ADD CONSTRAINT "llm_call_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_chunk" ADD CONSTRAINT "code_chunk_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_chunk" ADD CONSTRAINT "code_chunk_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

