import { config } from '../config.js';

export interface AgentJobEvent {
  status: string;
  timestamp: string;
  payload?: Record<string, unknown>;
  error?: string;
}

export interface LlmCallRecord {
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd?: number;
  durationMs?: number;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  initialDelay = 100
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`Request failed with status ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < retries - 1) {
      const waitTime = initialDelay * Math.pow(2, attempt);
      await delay(waitTime);
    }
  }

  throw lastError || new Error(`Request failed after ${retries} attempts`);
}

export class CoreClient {
  private coreUrl: string;
  private serviceToken: string;

  constructor(coreUrl = config.coreUrl, serviceToken = config.serviceToken) {
    this.coreUrl = coreUrl.replace(/\/$/, '');
    this.serviceToken = serviceToken;
  }

  async sendEvent(jobId: string, event: AgentJobEvent): Promise<void> {
    const url = `${this.coreUrl}/internal/agent-jobs/${jobId}/events`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
      },
      body: JSON.stringify(event),
    };

    await requestWithRetry(url, options);
  }

  async sendLlmCall(jobId: string, llmCall: LlmCallRecord): Promise<void> {
    const url = `${this.coreUrl}/internal/agent-jobs/${jobId}/llm-calls`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
      },
      body: JSON.stringify(llmCall),
    };

    await requestWithRetry(url, options);
  }
}
