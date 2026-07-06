import { PrismaClient } from '@prisma/client';

export interface AuditEntry {
  tenantId: string;
  projectId?: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(entry: AuditEntry) {
    if (!entry.projectId) {
      throw new Error('projectId is required');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(entry.actor);
    const actorId = isUuid ? entry.actor : null;
    const actorType = isUuid ? 'user' : entry.actor;

    return this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        projectId: entry.projectId,
        actorType,
        actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        payload: {
          before: entry.before ?? null,
          after: entry.after ?? null,
        },
      },
    });
  }
}
