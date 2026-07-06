import test, { TestContext } from 'node:test';
import assert from 'node:assert';
import { PrismaClient, Prisma } from '@prisma/client';
import { withTenant } from './tenant-context.js';

test('Row-Level Security (RLS) Tenant Isolation Test', async (t: TestContext) => {
  const superuserUrl = process.env.DATABASE_URL || 'postgresql://factory:factory@localhost:5432/factory';

  // Instantiate the superuser prisma client
  const superPrisma = new PrismaClient({
    datasources: {
      db: {
        url: superuserUrl,
      },
    },
  });

  try {
    // Check database connection
    await superPrisma.$queryRaw`SELECT 1`;
  } catch (error) {
    t.skip(`Skipping test: Database is not accessible at ${superuserUrl}. Reason: ${(error as Error).message}`);
    await superPrisma.$disconnect();
    return;
  }

  // Define connection URL for the non-superuser test role
  const testUser = 'tenant_test_user';
  const testPass = 'tenant_test_pass';
  const testUserUrl = superuserUrl
    .replace('factory:factory@', `${testUser}:${testPass}@`)
    .replace('localhost', '127.0.0.1'); // bypass any localhost resolve issues

  // Create a separate prisma client under the non-superuser role
  let testPrisma: PrismaClient | null = null;

  await t.test('Setup non-superuser database role and grant permissions', async () => {
    // Safely drop the role and its owned objects if it already exists
    try {
      await superPrisma.$executeRawUnsafe(`DROP OWNED BY ${testUser}`);
    } catch (e) {
      console.warn(`Could not drop owned objects of ${testUser}: ${(e as Error).message}`);
    }
    await superPrisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ${testUser}`);
    
    // Create the new test user with login rights
    await superPrisma.$executeRawUnsafe(`CREATE ROLE ${testUser} WITH LOGIN PASSWORD '${testPass}'`);
    
    // Grant schema and table permissions
    await superPrisma.$executeRawUnsafe(`GRANT USAGE, CREATE ON SCHEMA public TO ${testUser}`);
    await superPrisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${testUser}`);
    await superPrisma.$executeRawUnsafe(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${testUser}`);
    
    // Instantiate prisma client using the non-superuser connection
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testUserUrl,
        },
      },
    });
  });

  // Unique tenant and project IDs
  const tenantAId = 'a0000000-0000-0000-0000-00000000000a';
  const tenantBId = 'b0000000-0000-0000-0000-00000000000b';
  const projectAId = 'a0000000-0000-0000-0000-00000000001a';
  const projectBId = 'b0000000-0000-0000-0000-00000000001b';

  await t.test('Clean up old test data if any', async () => {
    // We clean up using the superuser prisma client since RLS is forced on the tables
    // and a non-superuser without a tenant context wouldn't be able to delete them.
    await superPrisma.project.deleteMany({
      where: {
        id: { in: [projectAId, projectBId] },
      },
    });
    await superPrisma.tenant.deleteMany({
      where: {
        id: { in: [tenantAId, tenantBId] },
      },
    });
  });

  await t.test('Setup test tenants and projects', async () => {
    // Create tenants using the superuser first to avoid RLS restrictions during initialization
    await superPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Tenant A',
        deployMode: 'shared',
        modelPolicy: 'api_allowed',
      },
    });

    await superPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Tenant B',
        deployMode: 'shared',
        modelPolicy: 'api_allowed',
      },
    });

    // Create projects using the superuser
    await superPrisma.project.create({
      data: {
        id: projectAId,
        name: 'Project A',
        customerName: 'Customer A',
        githubRepo: 'owner/repo-a',
        githubInstallationId: BigInt(1111),
        settings: {},
        status: 'active',
        tenantId: tenantAId,
      },
    });

    await superPrisma.project.create({
      data: {
        id: projectBId,
        name: 'Project B',
        customerName: 'Customer B',
        githubRepo: 'owner/repo-b',
        githubInstallationId: BigInt(2222),
        settings: {},
        status: 'active',
        tenantId: tenantBId,
      },
    });
  });

  await t.test('Read under tenant A context (isolated)', async () => {
    if (!testPrisma) throw new Error('testPrisma client not initialized');

    // Run query inside withTenant for tenant A using the non-superuser client
    const projects = await withTenant(testPrisma, tenantAId, async (tx: Prisma.TransactionClient) => {
      return tx.project.findMany({
        where: {
          id: { in: [projectAId, projectBId] },
        },
      });
    });

    assert.strictEqual(projects.length, 1, 'Tenant A should only see 1 project under its context');
    assert.strictEqual(projects[0].id, projectAId, 'Tenant A should only see project A');
  });

  await t.test('Read under tenant B context (isolated)', async () => {
    if (!testPrisma) throw new Error('testPrisma client not initialized');

    // Run query inside withTenant for tenant B using the non-superuser client
    const projects = await withTenant(testPrisma, tenantBId, async (tx: Prisma.TransactionClient) => {
      return tx.project.findMany({
        where: {
          id: { in: [projectAId, projectBId] },
        },
      });
    });

    assert.strictEqual(projects.length, 1, 'Tenant B should only see 1 project under its context');
    assert.strictEqual(projects[0].id, projectBId, 'Tenant B should only see project B');
  });

  // Post-test cleanup
  await t.test('Tear down test resources', async () => {
    if (testPrisma) {
      await testPrisma.$disconnect();
    }
    
    // Delete data using superuser
    await superPrisma.project.deleteMany({
      where: {
        id: { in: [projectAId, projectBId] },
      },
    });
    await superPrisma.tenant.deleteMany({
      where: {
        id: { in: [tenantAId, tenantBId] },
      },
    });

    // Drop the test user role and its privileges safely
    try {
      await superPrisma.$executeRawUnsafe(`DROP OWNED BY ${testUser}`);
    } catch (e) {
      console.warn(`Could not drop owned objects of ${testUser}: ${(e as Error).message}`);
    }
    await superPrisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ${testUser}`);
    await superPrisma.$disconnect();
  });
});
