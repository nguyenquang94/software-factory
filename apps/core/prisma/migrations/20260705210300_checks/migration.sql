CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "intent" ADD CONSTRAINT "intent_status_check" CHECK (status IN ('draft', 'clarifying', 'ba_running', 'gate_a', 'approved', 'rejected'));
ALTER TABLE "task" ADD CONSTRAINT "task_status_check" CHECK (status IN ('backlog', 'planned', 'ai_drafting', 'agent_review', 'awaiting_human', 'approved', 'integrated', 'verified', 'done', 'blocked', 'failed', 'cancelled'));
ALTER TABLE "agent_job" ADD CONSTRAINT "agent_job_status_check" CHECK (status IN ('queued', 'running', 'succeeded', 'needs_human', 'failed', 'timeout', 'budget_exceeded', 'cancelled'));
ALTER TABLE "attention_item" ADD CONSTRAINT "attention_item_status_check" CHECK (status IN ('open', 'in_review', 'resolved', 'escalated'));
ALTER TABLE "breakdown" ADD CONSTRAINT "breakdown_status_check" CHECK (status IN ('draft', 'gate_b', 'locked', 'superseded'));
