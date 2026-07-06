import type { AgentJobPayload, AgentRole } from '@factory/shared';

const VALID_ROLES: AgentRole[] = [
  'ba',
  'pm',
  'design',
  'code',
  'test',
  'doc',
  'cross_review',
  'prototype',
  'reverse_engineer',
];

export function validatePayload(payload: unknown): AgentJobPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Payload must be a non-null object');
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.agent_job_id !== 'string' || p.agent_job_id.trim() === '') {
    throw new Error('agent_job_id must be a non-empty string');
  }

  if (typeof p.role !== 'string' || !VALID_ROLES.includes(p.role as AgentRole)) {
    throw new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);
  }

  if (p.intent_id !== undefined && typeof p.intent_id !== 'string') {
    throw new Error('intent_id must be a string');
  }

  if (p.task_id !== undefined && typeof p.task_id !== 'string') {
    throw new Error('task_id must be a string');
  }

  if (typeof p.repo !== 'object' || p.repo === null) {
    throw new Error('repo must be a non-null object');
  }

  const repo = p.repo as Record<string, unknown>;
  if (typeof repo.github !== 'string' || repo.github.trim() === '') {
    throw new Error('repo.github must be a non-empty string');
  }
  if (typeof repo.base_branch !== 'string' || repo.base_branch.trim() === '') {
    throw new Error('repo.base_branch must be a non-empty string');
  }
  if (typeof repo.work_branch !== 'string' || repo.work_branch.trim() === '') {
    throw new Error('repo.work_branch must be a non-empty string');
  }

  if (typeof p.rules_version !== 'string' || p.rules_version.trim() === '') {
    throw new Error('rules_version must be a non-empty string');
  }

  if (typeof p.context !== 'object' || p.context === null) {
    throw new Error('context must be a non-null object');
  }

  if (typeof p.agent_profile_id !== 'string' || p.agent_profile_id.trim() === '') {
    throw new Error('agent_profile_id must be a non-empty string');
  }

  if (typeof p.token_budget !== 'number' || isNaN(p.token_budget)) {
    throw new Error('token_budget must be a number');
  }

  if (typeof p.timeout_ms !== 'number' || isNaN(p.timeout_ms)) {
    throw new Error('timeout_ms must be a number');
  }

  return p as unknown as AgentJobPayload;
}
