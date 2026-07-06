import { CallHandler, ExecutionContext, NestInterceptor, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service.js';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditMetadata {
  action: string;
  entityType: string;
}

interface AuditRequest {
  user?: {
    id?: string;
    email?: string;
    tenantId?: string;
  };
  tenantId?: string;
  projectId?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  auditBeforeState?: unknown;
}

export function Audit(metadata: AuditMetadata) {
  return (_target: unknown, _key: string, descriptor: PropertyDescriptor) => {
    const fn = descriptor.value as Record<string, unknown>;
    fn[AUDIT_METADATA_KEY] = metadata;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const fn = handler as unknown as Record<string, unknown> | undefined;
    const metadata = fn ? (fn[AUDIT_METADATA_KEY] as AuditMetadata) : undefined;

    const request = context.switchToHttp().getRequest() as AuditRequest;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const actor = request?.user?.id || request?.user?.email || 'system';
          const tenantId = request?.user?.tenantId || request?.tenantId || request?.headers?.['x-tenant-id'];
          const projectId = request?.params?.projectId || (request?.body?.projectId as string | undefined) || request?.projectId;
          
          const responseId = response && typeof response === 'object' ? (response as Record<string, unknown>).id : undefined;
          const entityId = request?.params?.id || (request?.body?.id as string | undefined) || (responseId as string | undefined);

          const action = metadata?.action || 'unknown';
          const entityType = metadata?.entityType || 'unknown';

          const before = request?.auditBeforeState;
          const after = response;

          if (tenantId) {
            await this.auditService.record({
              tenantId,
              projectId,
              actor,
              action,
              entityType,
              entityId: typeof entityId === 'string' ? entityId : '',
              before,
              after,
            });
          }
        } catch (err) {
          console.error('AuditInterceptor error:', err);
        }
      })
    );
  }
}
