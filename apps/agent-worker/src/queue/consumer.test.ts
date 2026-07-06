import { test } from 'node:test';
import * as assert from 'node:assert';
import { processAgentJob } from './consumer.js';
import { Workspace } from '../workspace/workspace.js';
import { CoreClient } from '../callbacks/core-client.js';
import { MockRunner } from '../runner/mock-runner.js';

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

test('consumer - processAgentJob runs end-to-end successfully with mocked dependencies', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmCalls: any[] = [];
  let workspaceInitCalled = false;
  let workspaceCleanupCalled = false;

  // Mock CoreClient
  const mockCoreClient = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendEvent: async (jobId: string, event: any) => {
      events.push({ jobId, event });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendLlmCall: async (jobId: string, llmCall: any) => {
      llmCalls.push({ jobId, llmCall });
    },
  } as unknown as CoreClient;

  // Mock Workspace
  const mockWorkspace = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    init: async (repo: any) => {
      void repo;
      workspaceInitCalled = true;
      return '/tmp/mock-workspace-dir';
    },
    cleanup: async () => {
      workspaceCleanupCalled = true;
    },
  } as unknown as Workspace;

  // Mock Runner
  const mockRunner = {
    run: async (jobId: string, context: Record<string, unknown>) => {
      void jobId;
      void context;
      return {
        status: 'succeeded',
        artifacts: ['file1.txt', 'file2.txt'],
        tokensUsed: 150,
        costUsd: 0.005,
      };
    },
  } as unknown as MockRunner;

  await processAgentJob(validPayload, {
    coreClient: mockCoreClient,
    workspace: mockWorkspace,
    runner: mockRunner,
  });

  // Verify workspace interactions
  assert.equal(workspaceInitCalled, true);
  assert.equal(workspaceCleanupCalled, true);

  // Verify Core API callbacks
  assert.equal(events.length, 2);
  assert.equal(events[0].event.status, 'running');
  assert.equal(events[1].event.status, 'succeeded');
  assert.deepEqual(events[1].event.payload.artifacts, ['file1.txt', 'file2.txt']);

  assert.equal(llmCalls.length, 1);
  assert.equal(llmCalls[0].llmCall.model, 'mock-model');
  assert.equal(llmCalls[0].llmCall.completionTokens, 150);
  assert.equal(llmCalls[0].llmCall.costUsd, 0.005);
});

test('consumer - processAgentJob sends failure event if runner or workspace fails', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = [];

  const mockCoreClient = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendEvent: async (jobId: string, event: any) => {
      events.push({ jobId, event });
    },
    sendLlmCall: async () => {},
  } as unknown as CoreClient;

  const mockWorkspace = {
    init: async () => '/tmp/mock-dir',
    cleanup: async () => {},
  } as unknown as Workspace;

  const mockRunner = {
    run: async () => {
      throw new Error('Simulation of runner crash');
    },
  } as unknown as MockRunner;

  await assert.rejects(async () => {
    await processAgentJob(validPayload, {
      coreClient: mockCoreClient,
      workspace: mockWorkspace,
      runner: mockRunner,
    });
  }, /Simulation of runner crash/);

  // Verify that failure event was sent
  assert.equal(events.length, 2);
  assert.equal(events[0].event.status, 'running');
  assert.equal(events[1].event.status, 'failed');
  assert.equal(events[1].event.error, 'Simulation of runner crash');
});
