import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Tenant',
      deployMode: 'shared',
      modelPolicy: 'api_allowed',
    },
  });

  console.log(`Tenant created/upserted: ${tenant.name} (${tenant.id})`);

  // Create a sample project for the default tenant
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Sample Project',
      customerName: 'Acme Corp',
      githubRepo: 'acme/sample-project',
      githubInstallationId: BigInt(12345678),
      settings: {
        auto_merge: false,
        budget: 100,
      },
      status: 'active',
      tenantId: tenant.id,
    },
  });

  console.log(`Project created/upserted: ${project.name} (${project.id})`);
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
