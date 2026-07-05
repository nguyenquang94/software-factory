import type { AgentJobPayload } from '@factory/shared';

export function describeJob(job: AgentJobPayload): string {
  return `job ${job.agent_job_id} role=${job.role}`;
}
