import { mock, test } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { getInstallationToken, signAppJwt, clearTokenCache } from './github-app-auth.js';

test('signAppJwt should generate a valid RS256 JWT', async () => {
  const originalEnvId = process.env.GITHUB_APP_ID;
  const originalEnvKey = process.env.GITHUB_APP_PRIVATE_KEY;

  // Generate a valid temporary RSA-2048 key pair
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  process.env.GITHUB_APP_ID = '123456';
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey;

  try {
    const token = signAppJwt();
    assert.ok(token);
    const parts = token.split('.');
    assert.strictEqual(parts.length, 3);

    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    assert.strictEqual(header.alg, 'RS256');
    assert.strictEqual(header.typ, 'JWT');

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    assert.strictEqual(payload.iss, '123456');
    assert.ok(payload.iat);
    assert.ok(payload.exp);
    assert.ok(payload.exp - payload.iat <= 600);
  } finally {
    process.env.GITHUB_APP_ID = originalEnvId;
    process.env.GITHUB_APP_PRIVATE_KEY = originalEnvKey;
  }
});

test('getInstallationToken should cache token and reuse it if it is not expired', async () => {
  const originalEnvId = process.env.GITHUB_APP_ID;
  const originalEnvKey = process.env.GITHUB_APP_PRIVATE_KEY;

  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  process.env.GITHUB_APP_ID = '123456';
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey;

  clearTokenCache();

  const originalFetch = globalThis.fetch;
  let callCount = 0;

  const mockFetch = mock.fn(async () => {
    callCount++;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future (> 5 mins)
    return new Response(
      JSON.stringify({
        token: `token-${callCount}`,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200 }
    );
  });

  globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

  try {
    // First call: fetches from API
    const token1 = await getInstallationToken('inst-1');
    assert.strictEqual(token1, 'token-1');
    assert.strictEqual(callCount, 1);

    // Second call: gets from cache
    const token2 = await getInstallationToken('inst-1');
    assert.strictEqual(token2, 'token-1');
    assert.strictEqual(callCount, 1); // should still be 1
  } finally {
    globalThis.fetch = originalFetch;
    process.env.GITHUB_APP_ID = originalEnvId;
    process.env.GITHUB_APP_PRIVATE_KEY = originalEnvKey;
  }
});

test('getInstallationToken should fetch new token if cached token is close to expiration (< 5 mins)', async () => {
  const originalEnvId = process.env.GITHUB_APP_ID;
  const originalEnvKey = process.env.GITHUB_APP_PRIVATE_KEY;

  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  process.env.GITHUB_APP_ID = '123456';
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey;

  clearTokenCache();

  const originalFetch = globalThis.fetch;
  let callCount = 0;

  const mockFetch = mock.fn(async () => {
    callCount++;
    // First call returns token expiring in 4 minutes (< 5 mins buffer)
    const minutesInFuture = callCount === 1 ? 4 : 10;
    const expiresAt = new Date(Date.now() + minutesInFuture * 60 * 1000);
    return new Response(
      JSON.stringify({
        token: `token-${callCount}`,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200 }
    );
  });

  globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

  try {
    // First call: fetches from API
    const token1 = await getInstallationToken('inst-2');
    assert.strictEqual(token1, 'token-1');
    assert.strictEqual(callCount, 1);

    // Second call: cached token is expiring in < 5 mins, should call API again
    const token2 = await getInstallationToken('inst-2');
    assert.strictEqual(token2, 'token-2');
    assert.strictEqual(callCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.GITHUB_APP_ID = originalEnvId;
    process.env.GITHUB_APP_PRIVATE_KEY = originalEnvKey;
  }
});
