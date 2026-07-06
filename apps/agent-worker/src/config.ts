export interface Config {
  redisUrl: string;
  coreUrl: string;
  serviceToken: string;
  maxConcurrentJobs: number;
  keepWorkspace: boolean;
}

export function getConfig(): Config {
  const maxConcurrentJobs = process.env.FACTORY_MAX_CONCURRENT_JOBS
    ? parseInt(process.env.FACTORY_MAX_CONCURRENT_JOBS, 10)
    : 3;

  return {
    redisUrl: process.env.REDIS_URL || '',
    coreUrl: process.env.CORE_URL || '',
    serviceToken: process.env.SERVICE_TOKEN || '',
    maxConcurrentJobs: isNaN(maxConcurrentJobs) ? 3 : maxConcurrentJobs,
    keepWorkspace: process.env.FACTORY_KEEP_WORKSPACE === '1',
  };
}

export const config = getConfig();

export function validateConfig(cfg = config): void {
  if (!cfg.redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }
  if (!cfg.coreUrl) {
    throw new Error('CORE_URL environment variable is required');
  }
  if (!cfg.serviceToken) {
    throw new Error('SERVICE_TOKEN environment variable is required');
  }
}
