import crypto from 'node:crypto';

interface TokenCache {
  token: string;
  expiresAt: Date;
}

const tokenCache = new Map<string, TokenCache>();

function base64url(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Signs a JWT token for the GitHub App using RS256 algorithm.
 * Uses process.env.GITHUB_APP_ID and process.env.GITHUB_APP_PRIVATE_KEY.
 */
export function signAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId) {
    throw new Error('GITHUB_APP_ID is not set in environment variables');
  }
  if (!privateKey) {
    throw new Error('GITHUB_APP_PRIVATE_KEY is not set in environment variables');
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60 seconds ago for clock drift
    exp: now + 540, // 9 minutes expiration (<= 10 mins)
    iss: appId,
  };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const message = `${headerB64}.${payloadB64}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  const signature = signer.sign(privateKey);
  const signatureB64 = base64url(signature);

  return `${message}.${signatureB64}`;
}

/**
 * Gets an installation access token for the given installation ID.
 * Caches the token and automatically requests a new one when there is less than 5 minutes remaining.
 */
export async function getInstallationToken(installationId: string): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached) {
    const timeRemainingMs = cached.expiresAt.getTime() - Date.now();
    // Buffer: 5 minutes (300,000 ms)
    if (timeRemainingMs > 5 * 60 * 1000) {
      return cached.token;
    }
  }

  const jwt = signAppJwt();
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'factory-core',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get installation token: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as { token: string; expires_at: string };
  const expiresAt = new Date(data.expires_at);

  tokenCache.set(installationId, {
    token: data.token,
    expiresAt,
  });

  return data.token;
}

/**
 * Clears the token cache. Primarily used for testing purposes.
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}
