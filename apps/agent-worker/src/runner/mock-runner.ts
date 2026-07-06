export interface RunResult {
  status: 'succeeded' | 'needs_human' | 'failed' | 'timeout' | 'budget_exceeded';
  artifacts: string[];
  tokensUsed: number;
  costUsd?: number;
}

export class MockRunner {
  readonly name = 'mock-runner';

  async run(jobId: string, context: Record<string, unknown>): Promise<RunResult> {
    void jobId;
    void context;
    // Simulate minor asynchronous work
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      status: 'succeeded',
      artifacts: [],
      tokensUsed: 0,
      costUsd: 0,
    };
  }
}
