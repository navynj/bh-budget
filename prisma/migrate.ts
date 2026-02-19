import 'dotenv/config';
import { prisma } from '../lib/core/prisma';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/** Migrate realms that have UUID ids to CUID (create new realm with same data, repoint locations, delete old). */
async function migrateRealmIdsToCuid(): Promise<void> {
  const allRealms = await prisma.realm.findMany({
    select: {
      id: true,
      realmId: true,
      name: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      refreshExpiresAt: true,
    },
  });

  const toMigrate = allRealms.filter((r) => isUuid(r.id));
  if (toMigrate.length === 0) return;

  for (const old of toMigrate) {
    const tempRealmId = `${old.realmId}-migrate-${old.id}`;
    const newRealm = await prisma.realm.create({
      data: {
        realmId: tempRealmId,
        name: old.name,
        accessToken: old.accessToken,
        refreshToken: old.refreshToken,
        expiresAt: old.expiresAt,
        refreshExpiresAt: old.refreshExpiresAt,
      },
    });
    await prisma.location.updateMany({
      where: { realmId: old.id },
      data: { realmId: newRealm.id },
    });
    await prisma.realm.delete({ where: { id: old.id } });
    await prisma.realm.update({
      where: { id: newRealm.id },
      data: { realmId: old.realmId },
    });
  }
  console.log(`Seed: migrated ${toMigrate.length} realm(s) from UUID to CUID.`);
}

async function main() {
  await migrateRealmIdsToCuid();

  // const locations = [
  //   { code: 'HQ', name: 'Headquarters' },
  //   { code: 'CC', name: 'CC Location' },
  //   { code: 'PM', name: 'PM Location' },
  // ];

  // for (const loc of locations) {
  //   const realm = await prisma.realm.upsert({
  //     where: { realmId: `seed-${loc.code}` },
  //     create: {
  //       realmId: `seed-${loc.code}`,
  //       name: loc.name,
  //       accessToken: '=== ACCESS TOKEN ===',
  //       refreshToken: '=== REFRESH TOKEN ===',
  //       expiresAt: new Date(),
  //       refreshExpiresAt: new Date(),
  //     },
  //     update: { name: loc.name },
  //   });

  //   await prisma.location.upsert({
  //     where: { code: loc.code },
  //     create: {
  //       code: loc.code,
  //       name: loc.name,
  //       realmId: realm.id,
  //     },
  //     update: { name: loc.name, realmId: realm.id },
  //   });
  // }

  console.log('Seed: realms and locations HQ, CC, PM created/updated.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
