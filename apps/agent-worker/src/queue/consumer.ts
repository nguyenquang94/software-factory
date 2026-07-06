import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AGENT_JOBS_QUEUE } from '@factory/shared';
import { config } from '../config.js';
import { validatePayload } from './validator.js';
import { Workspace } from '../workspace/workspace.js';
import { CoreClient } from '../callbacks/core-client.js';
import { MockRunner } from '../runner/mock-runner.js';

export async function processAgentJob(
  jobData: unknown,
  deps?: {
    coreClient?: CoreClient;
    workspace?: Workspace;
    runner?: MockRunner;
  }
): Promise<void> {
  const payload = validatePayload(jobData);
  
  const coreClient = deps?.coreClient || new CoreClient();
  const workspace = deps?.workspace || new Workspace();
  const runner = deps?.runner || new MockRunner();

  console.log(`[Worker] Starting job ${payload.agent_job_id} role=${payload.role}`);

  // Send started event
  try {
    await coreClient.sendEvent(payload.agent_job_id, {
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Failed to send started event: ${errMsg}`);
  }

  try {
    // Init workspace (git clone & checkout branch)
    await workspace.init(payload.repo);

    // Run agent mock runner
    const runResult = await runner.run(payload.agent_job_id, payload.context);

    // Send completed event and llm calls
    await coreClient.sendEvent(payload.agent_job_id, {
      status: runResult.status,
      timestamp: new Date().toISOString(),
      payload: {
        artifacts: runResult.artifacts,
      },
    });

    await coreClient.sendLlmCall(payload.agent_job_id, {
      model: 'mock-model',
      promptTokens: 0,
      completionTokens: runResult.tokensUsed,
      costUsd: runResult.costUsd || 0,
    });

    console.log(`[Worker] Job ${payload.agent_job_id} finished with status: ${runResult.status}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Worker] Job ${payload.agent_job_id} failed: ${errMsg}`);
    
    // Send failed event
    try {
      await coreClient.sendEvent(payload.agent_job_id, {
        status: 'failed',
        error: errMsg,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const innerMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] Failed to send error event: ${innerMsg}`);
    }

    throw error;
  } finally {
    // Cleanup workspace
    if (workspace) {
      await workspace.cleanup();
    }
  }
}

export function startWorker() {
  const connection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    AGENT_JOBS_QUEUE,
    async (job: Job) => {
      await processAgentJob(job.data);
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: connection as any,
      concurrency: config.maxConcurrentJobs,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed in queue: ${err.message}`);
  });

  return { worker, connection };
}
