import { mock, test } from 'node:test';
import assert from 'node:assert';
import { GitHubClient } from './github.client.js';

test('GitHubClient methods should request correct endpoint with correct options', async () => {
  const originalFetch = globalThis.fetch;
  
  const context = {
    lastUrl: '',
    lastInit: undefined as RequestInit | undefined
  };
  
  const mockFetch = mock.fn(async (url: string | globalThis.Request | URL, init?: RequestInit) => {
    context.lastUrl = url.toString();
    context.lastInit = init;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  
  globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
  
  try {
    const client = new GitHubClient('test-token');
    
    // 1. Test createBranch
    await client.createBranch('owner/repo', 'feature-branch', 'sha123');
    assert.strictEqual(context.lastUrl, 'https://api.github.com/repos/owner/repo/git/refs');
    assert.strictEqual(context.lastInit?.method, 'POST');
    assert.deepStrictEqual(JSON.parse(context.lastInit?.body as string), {
      ref: 'refs/heads/feature-branch',
      sha: 'sha123'
    });
    
    const headers1 = context.lastInit?.headers as Record<string, string> | undefined;
    assert.strictEqual(headers1?.['Authorization'], 'Bearer test-token');
    assert.strictEqual(headers1?.['Accept'], 'application/vnd.github+json');
    assert.strictEqual(headers1?.['User-Agent'], 'factory-core');
    
    // 2. Test createPr
    await client.createPr('owner/repo', 'feature-branch', 'main', 'Title', 'Body');
    assert.strictEqual(context.lastUrl, 'https://api.github.com/repos/owner/repo/pulls');
    assert.strictEqual(context.lastInit?.method, 'POST');
    assert.deepStrictEqual(JSON.parse(context.lastInit?.body as string), {
      title: 'Title',
      head: 'feature-branch',
      base: 'main',
      body: 'Body'
    });
    
    const headers2 = context.lastInit?.headers as Record<string, string> | undefined;
    assert.strictEqual(headers2?.['Authorization'], 'Bearer test-token');
    
    // 3. Test commentOnIssue
    await client.commentOnIssue('owner/repo', 42, 'comment text');
    assert.strictEqual(context.lastUrl, 'https://api.github.com/repos/owner/repo/issues/42/comments');
    assert.strictEqual(context.lastInit?.method, 'POST');
    assert.deepStrictEqual(JSON.parse(context.lastInit?.body as string), {
      body: 'comment text'
    });
    
    // 4. Test getIssue
    await client.getIssue('owner/repo', 42);
    assert.strictEqual(context.lastUrl, 'https://api.github.com/repos/owner/repo/issues/42');
    assert.strictEqual(context.lastInit?.method, 'GET');
    assert.strictEqual(context.lastInit?.body, undefined);
    
    // 5. Test lazy loading token via function
    let tokenCallCount = 0;
    const lazyClient = new GitHubClient(async () => {
      tokenCallCount++;
      return `lazy-token-${tokenCallCount}`;
    });
    
    await lazyClient.getIssue('owner/repo', 42);
    const headersLazy1 = context.lastInit?.headers as Record<string, string> | undefined;
    assert.strictEqual(headersLazy1?.['Authorization'], 'Bearer lazy-token-1');
    assert.strictEqual(tokenCallCount, 1);
    
    await lazyClient.getIssue('owner/repo', 42);
    const headersLazy2 = context.lastInit?.headers as Record<string, string> | undefined;
    assert.strictEqual(headersLazy2?.['Authorization'], 'Bearer lazy-token-2');
    assert.strictEqual(tokenCallCount, 2);
    
  } finally {
    globalThis.fetch = originalFetch;
  }
});
