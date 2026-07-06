import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Execute database operations in a transaction isolated by tenant_id using Row-Level Security (RLS).
 * Sets the local transaction variable 'app.tenant_id' to the specified tenantId.
 *
 * @param prisma The Prisma Client instance
 * @param tenantId The UUID string of the tenant
 * @param fn The callback function containing the operations to perform
 */
export async function withTenant<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set local variable 'app.tenant_id' for this transaction session.
    // In PostgreSQL, Configuration parameters cannot be parameterized directly using SET LOCAL app.tenant_id = $1.
    // Instead, we use the standard helper function set_config('app.tenant_id', $1, true) which is fully parameterizable.
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
    return fn(tx);
  });
}
