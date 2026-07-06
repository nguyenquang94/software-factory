import { test } from 'node:test';
import * as assert from 'node:assert';
import { CoreClient, requestWithRetry } from './core-client.js';

test('core-client - requestWithRetry succeeds on first attempt', async () => {
  let callCount = 0;
  const mockFetch = async (url: string, options?: unknown) => {
    void url;
    void options;
    callCount++;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response;
  };

  // Temporarily override global fetch
  const originalFetch = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = mockFetch as any;

  try {
    const res = await requestWithRetry('http://test.com', {}, 3, 1);
    assert.equal(callCount, 1);
    assert.equal(res.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('core-client - requestWithRetry retries on failure and eventually succeeds', async () => {
  let callCount = 0;
  const mockFetch = async (url: string, options?: unknown) => {
    void url;
    void options;
    callCount++;
    if (callCount < 3) {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response;
  };

  const originalFetch = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = mockFetch as any;

  try {
    const res = await requestWithRetry('http://test.com', {}, 3, 1);
    assert.equal(callCount, 3);
    assert.equal(res.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('core-client - requestWithRetry throws error after max retries', async () => {
  let callCount = 0;
  const mockFetch = async (url: string, options?: unknown) => {
    void url;
    void options;
    callCount++;
    return {
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    } as Response;
  };

  const originalFetch = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = mockFetch as any;

  try {
    await assert.rejects(
      async () => {
        await requestWithRetry('http://test.com', {}, 3, 1);
      },
      /Request failed with status 502/
    );
    assert.equal(callCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('core-client - CoreClient sends events and llm-calls successfully', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: { url: string; body: any }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFetch = async (url: string, options?: any) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response;
  };

  const originalFetch = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = mockFetch as any;

  try {
    const client = new CoreClient('http://core-api', 'test-token');
    
    await client.sendEvent('job-1', { status: 'running', timestamp: '2026-07-06T00:00:00Z' });
    await client.sendLlmCall('job-1', { model: 'gpt-4', promptTokens: 10, completionTokens: 20 });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'http://core-api/internal/agent-jobs/job-1/events');
    assert.equal(calls[0].body.status, 'running');
    assert.equal(calls[1].url, 'http://core-api/internal/agent-jobs/job-1/llm-calls');
    assert.equal(calls[1].body.model, 'gpt-4');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
