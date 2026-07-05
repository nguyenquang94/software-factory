export type AgentRole =
  | 'ba'
  | 'pm'
  | 'design'
  | 'code'
  | 'test'
  | 'doc'
  | 'cross_review'
  | 'prototype'
  | 'reverse_engineer';

export type AgentJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'needs_human'
  | 'failed'
  | 'timeout'
  | 'budget_exceeded'
  | 'cancelled';

export interface AgentJobPayload {
  agent_job_id: string;
  role: AgentRole;
  intent_id?: string;
  task_id?: string;
  repo: { github: string; base_branch: string; work_branch: string };
  rules_version: string;
  context: Record<string, unknown>;
  agent_profile_id: string;
  token_budget: number;
  timeout_ms: number;
}

export const AGENT_JOBS_QUEUE = 'agent-jobs';
