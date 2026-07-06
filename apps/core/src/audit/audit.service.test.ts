/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AuditService } from './audit.service.js';
import { AuditInterceptor, AUDIT_METADATA_KEY } from './audit.interceptor.js';
import { of } from 'rxjs';

describe('Audit Module', () => {
  describe('AuditService', () => {
    test('should record an audit log correctly by mapping inputs to database schema fields', async () => {
      const createdLogs: any[] = [];
      const mockPrisma = {
        auditLog: {
          create: async ({ data }: { data: any }) => {
            createdLogs.push(data);
            return { id: 'generated-uuid-abc', ...data };
          }
        }
      } as any;

      const service = new AuditService(mockPrisma);

      const entry = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        actor: 'user-789',
        action: 'UPDATE_STATUS',
        entityType: 'Task',
        entityId: 'task-abc',
        before: { status: 'PENDING' },
        after: { status: 'COMPLETED' },
      };

      await service.record(entry);

      assert.strictEqual(createdLogs.length, 1);
      const log = createdLogs[0];
      assert.strictEqual(log.tenantId, 'tenant-123');
      assert.strictEqual(log.projectId, 'project-456');
      assert.strictEqual(log.action, 'UPDATE_STATUS');
      assert.strictEqual(log.entityType, 'Task');
      assert.strictEqual(log.entityId, 'task-abc');
      assert.strictEqual(log.actorType, 'user-789');
      assert.strictEqual(log.actorId, null);
      assert.deepStrictEqual(log.payload, {
        before: { status: 'PENDING' },
        after: { status: 'COMPLETED' },
      });
    });

    test('should map actor to user type if actor is a valid UUID', async () => {
      const createdLogs: any[] = [];
      const mockPrisma = {
        auditLog: {
          create: async ({ data }: { data: any }) => {
            createdLogs.push(data);
            return { id: 'generated-uuid-abc', ...data };
          }
        }
      } as any;

      const service = new AuditService(mockPrisma);
      const actorUuid = '12345678-1234-1234-1234-123456789012';

      await service.record({
        tenantId: 'tenant-123',
        projectId: 'project-456',
        actor: actorUuid,
        action: 'DELETE',
        entityType: 'User',
        entityId: '12345678-1234-1234-1234-123456789013',
      });

      assert.strictEqual(createdLogs.length, 1);
      const log = createdLogs[0];
      assert.strictEqual(log.actorType, 'user');
      assert.strictEqual(log.actorId, actorUuid);
    });

    test('should throw error if projectId is missing', async () => {
      const mockPrisma = {
        auditLog: {
          create: async () => ({})
        }
      } as any;
      const service = new AuditService(mockPrisma);

      await assert.rejects(
        () => service.record({
          tenantId: 'tenant-123',
          actor: 'user-789',
          action: 'CREATE',
          entityType: 'Task',
          entityId: 'task-abc',
        }),
        /projectId is required/
      );
    });
  });

  describe('AuditInterceptor', () => {
    test('should record an audit log exactly once after handler finishes successfully', async () => {
      const recordedEntries: any[] = [];
      const mockAuditService = {
        record: async (entry: any) => {
          recordedEntries.push(entry);
          return {};
        }
      } as any;

      const interceptor = new AuditInterceptor(mockAuditService);

      const mockHandler = () => {};
      (mockHandler as any)[AUDIT_METADATA_KEY] = {
        action: 'UPDATE_TASK',
        entityType: 'Task',
      };

      const mockRequest = {
        user: { id: 'user-uuid-111', tenantId: 'tenant-uuid-222' },
        projectId: 'project-uuid-333',
        params: { id: 'task-uuid-444' },
        auditBeforeState: { status: 'TODO' },
      };

      const mockContext = {
        getHandler: () => mockHandler,
        getClass: () => class TestController {},
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
        }),
      } as any;

      const responseData = { id: 'task-uuid-444', status: 'IN_PROGRESS' };
      const mockCallHandler = {
        handle: () => of(responseData),
      } as any;

      let responseReceived: any = null;
      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          next: (res) => {
            responseReceived = res;
          },
          error: (err) => reject(err),
          complete: () => resolve(),
        });
      });

      assert.deepStrictEqual(responseReceived, responseData);
      assert.strictEqual(recordedEntries.length, 1);
      
      const record = recordedEntries[0];
      assert.strictEqual(record.tenantId, 'tenant-uuid-222');
      assert.strictEqual(record.projectId, 'project-uuid-333');
      assert.strictEqual(record.actor, 'user-uuid-111');
      assert.strictEqual(record.action, 'UPDATE_TASK');
      assert.strictEqual(record.entityType, 'Task');
      assert.strictEqual(record.entityId, 'task-uuid-444');
      assert.deepStrictEqual(record.before, { status: 'TODO' });
      assert.deepStrictEqual(record.after, responseData);
    });
  });
});
