-- Enable Row Level Security and Create Tenant Isolation Policy for all business tables containing tenant_id

-- 1. project
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "project" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 2. agent_profile
ALTER TABLE "agent_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_profile" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agent_profile" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 3. role_assignment
ALTER TABLE "role_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_assignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "role_assignment" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 4. user
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 5. project_member
ALTER TABLE "project_member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_member" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "project_member" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 6. intent
ALTER TABLE "intent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "intent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "intent" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 7. clarifying_question
ALTER TABLE "clarifying_question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clarifying_question" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clarifying_question" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 8. prototype
ALTER TABLE "prototype" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prototype" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "prototype" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 9. breakdown
ALTER TABLE "breakdown" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "breakdown" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "breakdown" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 10. requirement
ALTER TABLE "requirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "requirement" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "requirement" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 11. story
ALTER TABLE "story" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "story" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 12. story_requirement
ALTER TABLE "story_requirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_requirement" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "story_requirement" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 13. acceptance_criterion
ALTER TABLE "acceptance_criterion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceptance_criterion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceptance_criterion" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 14. unit_of_work
ALTER TABLE "unit_of_work" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_of_work" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "unit_of_work" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 15. uow_dependency
ALTER TABLE "uow_dependency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uow_dependency" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "uow_dependency" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 16. task
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "task" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 17. bolt
ALTER TABLE "bolt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bolt" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bolt" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 18. agent_job
ALTER TABLE "agent_job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_job" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agent_job" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 19. agent_review
ALTER TABLE "agent_review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_review" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agent_review" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 20. attention_item
ALTER TABLE "attention_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attention_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attention_item" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 21. test_run
ALTER TABLE "test_run" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_run" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "test_run" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 22. test_run_ac
ALTER TABLE "test_run_ac" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_run_ac" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "test_run_ac" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 23. llm_call
ALTER TABLE "llm_call" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "llm_call" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "llm_call" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 24. audit_log
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_log" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 25. code_chunk
ALTER TABLE "code_chunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "code_chunk" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "code_chunk" USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
