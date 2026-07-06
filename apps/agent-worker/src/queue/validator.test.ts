import { test } from 'node:test';
import * as assert from 'node:assert';
import { validatePayload } from './validator.js';

const validPayload = {
  agent_job_id: 'job-123',
  role: 'code',
  intent_id: 'intent-123',
  task_id: 'task-123',
  repo: {
    github: 'owner/repo',
    base_branch: 'main',
    work_branch: 'factory/10-worker',
  },
  rules_version: '1.0.0',
  context: { foo: 'bar' },
  agent_profile_id: 'profile-123',
  token_budget: 1000,
  timeout_ms: 5000,
};

test('validator - should validate a valid payload successfully', () => {
  const result = validatePayload(validPayload);
  assert.equal(result.agent_job_id, 'job-123');
  assert.equal(result.role, 'code');
  assert.equal(result.repo.github, 'owner/repo');
});

test('validator - should throw error if payload is null or not an object', () => {
  assert.throws(() => validatePayload(null), /Payload must be a non-null object/);
  assert.throws(() => validatePayload('not-an-object'), /Payload must be a non-null object/);
});

test('validator - should throw error if agent_job_id is missing or invalid', () => {
  const invalid = { ...validPayload, agent_job_id: undefined };
  assert.throws(() => validatePayload(invalid), /agent_job_id must be a non-empty string/);

  const invalidType = { ...validPayload, agent_job_id: 123 };
  assert.throws(() => validatePayload(invalidType), /agent_job_id must be a non-empty string/);
});

test('validator - should throw error if role is invalid', () => {
  const invalid = { ...validPayload, role: 'invalid-role' };
  assert.throws(() => validatePayload(invalid), /role must be one of:/);
});

test('validator - should throw error if repo is missing or invalid', () => {
  const invalid = { ...validPayload, repo: undefined };
  assert.throws(() => validatePayload(invalid), /repo must be a non-null object/);

  const invalidGithub = {
    ...validPayload,
    repo: { github: '', base_branch: 'main', work_branch: 'work' },
  };
  assert.throws(() => validatePayload(invalidGithub), /repo.github must be a non-empty string/);

  const invalidBase = {
    ...validPayload,
    repo: { github: 'a', base_branch: 123, work_branch: 'work' },
  };
  assert.throws(() => validatePayload(invalidBase), /repo.base_branch must be a non-empty string/);
});

test('validator - should throw error if numeric fields are missing or not numbers', () => {
  const invalidBudget = { ...validPayload, token_budget: '1000' };
  assert.throws(() => validatePayload(invalidBudget), /token_budget must be a number/);

  const invalidTimeout = { ...validPayload, timeout_ms: undefined };
  assert.throws(() => validatePayload(invalidTimeout), /timeout_ms must be a number/);
});
