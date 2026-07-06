export class GitHubClient {
  private tokenOrLoader: string | (() => Promise<string>);

  constructor(tokenOrLoader: string | (() => Promise<string>)) {
    this.tokenOrLoader = tokenOrLoader;
  }

  private async getToken(): Promise<string> {
    if (typeof this.tokenOrLoader === 'function') {
      return await this.tokenOrLoader();
    }
    return this.tokenOrLoader;
  }

  private async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const token = await this.getToken();
    const url = `https://api.github.com${path}`;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'factory-core',
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} on ${options.method || 'GET'} ${path} - ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  async createBranch(repo: string, branch: string, baseSha: string): Promise<unknown> {
    const ref = `refs/heads/${branch}`;
    return this.request(`/repos/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref, sha: baseSha }),
    });
  }

  async createPr(repo: string, head: string, base: string, title: string, body: string): Promise<unknown> {
    return this.request(`/repos/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, head, base, body }),
    });
  }

  async commentOnIssue(repo: string, number: number, body: string): Promise<unknown> {
    return this.request(`/repos/${repo}/issues/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async getIssue(repo: string, number: number): Promise<unknown> {
    return this.request(`/repos/${repo}/issues/${number}`, {
      method: 'GET',
    });
  }
}
