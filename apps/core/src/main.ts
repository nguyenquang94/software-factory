import { AGENT_JOBS_QUEUE } from '@factory/shared';

export function bootstrapInfo(): string {
  return `factory-core skeleton — queue: ${AGENT_JOBS_QUEUE}`;
}
