import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_USER_EMAIL } from "../src/lib/db/demo-user";

/**
 * Deletes every user except the seeded demo account, along with everything they
 * own. Dry run by default — pass --yes to actually delete.
 *
 *   npx tsx scripts/delete-non-demo-users.ts          # preview
 *   npx tsx scripts/delete-non-demo-users.ts --yes    # delete
 *
 * Rows are removed in dependency order rather than leaning on the User cascade.
 * Item.itemTypeId is ON DELETE RESTRICT, so a user holding custom item types
 * with items attached can make the cascade fail depending on the order Postgres
 * happens to process it in. Deleting items first sidesteps that entirely.
 */

// The development branch endpoint. Everything here is destructive, so the
// script refuses to touch a database it doesn't recognise unless told to.
const DEV_ENDPOINT = "ep-withered-thunder-ahswdzxt";

const args = new Set(process.argv.slice(2));
const CONFIRMED = args.has("--yes");
const ALLOW_NON_DEV = args.has("--allow-non-dev");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

if (!connectionString.includes(DEV_ENDPOINT) && !ALLOW_NON_DEV) {
  console.error(
    `Refusing to run: DATABASE_URL does not point at the development endpoint (${DEV_ENDPOINT}).\n` +
      "If this is deliberate, re-run with --allow-non-dev.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

async function main() {
  const doomed = await prisma.user.findMany({
    where: { email: { not: DEMO_USER_EMAIL } },
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: {
          items: true,
          collections: true,
          itemTypes: true,
          accounts: true,
          sessions: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const demo = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });

  if (!demo) {
    console.warn(
      `⚠️  No ${DEMO_USER_EMAIL} row found — nothing is being preserved. ` +
        "Run npm run db:seed first if that isn't what you want.\n",
    );
  }

  if (doomed.length === 0) {
    console.log(`Nothing to do — ${DEMO_USER_EMAIL} is the only user.`);
    return;
  }

  console.log(
    `${CONFIRMED ? "Deleting" : "Would delete"} ${doomed.length} user(s), keeping ${DEMO_USER_EMAIL}:\n`,
  );
  console.table(
    doomed.map((user) => ({
      email: user.email,
      name: user.name ?? "—",
      items: user._count.items,
      collections: user._count.collections,
      customTypes: user._count.itemTypes,
      accounts: user._count.accounts,
      sessions: user._count.sessions,
    })),
  );

  // Tags are global rather than user-owned, so they only become deletable once
  // the items referencing them are gone. `every` also matches tags that already
  // have no items, which is exactly the set the sweep below removes.
  const orphanTagsAfter = await prisma.tag.count({
    where: { items: { every: { userId: { in: doomed.map((u) => u.id) } } } },
  });
  if (orphanTagsAfter > 0) {
    console.log(
      `Plus ${orphanTagsAfter} tag(s) left referencing nothing afterwards.\n`,
    );
  }

  if (!CONFIRMED) {
    console.log("Dry run — nothing was deleted. Re-run with --yes to proceed.");
    return;
  }

  const userIds = doomed.map((user) => user.id);
  const emails = doomed.map((user) => user.email);

  const result = await prisma.$transaction(async (tx) => {
    // Items first: clears the ItemCollection and ItemTags join rows, and frees
    // the RESTRICT reference to any custom ItemType
    const items = await tx.item.deleteMany({ where: { userId: { in: userIds } } });
    const collections = await tx.collection.deleteMany({
      where: { userId: { in: userIds } },
    });
    // userId is null for system types, so this only ever hits custom ones
    const itemTypes = await tx.itemType.deleteMany({
      where: { userId: { in: userIds } },
    });
    const accounts = await tx.account.deleteMany({
      where: { userId: { in: userIds } },
    });
    const sessions = await tx.session.deleteMany({
      where: { userId: { in: userIds } },
    });
    // Keyed by email, with no relation to User — nothing would clean these up
    const tokens = await tx.verificationToken.deleteMany({
      where: { identifier: { in: emails } },
    });
    const users = await tx.user.deleteMany({ where: { id: { in: userIds } } });

    // Now that the items are gone, sweep tags nothing points at any more
    const tags = await tx.tag.deleteMany({ where: { items: { none: {} } } });

    return { items, collections, itemTypes, accounts, sessions, tokens, users, tags };
  });

  console.log("Deleted:");
  console.table([
    {
      users: result.users.count,
      items: result.items.count,
      collections: result.collections.count,
      customTypes: result.itemTypes.count,
      accounts: result.accounts.count,
      sessions: result.sessions.count,
      verificationTokens: result.tokens.count,
      orphanTags: result.tags.count,
    },
  ]);

  const remaining = await prisma.user.findMany({ select: { email: true } });
  console.log(
    `\nRemaining users: ${remaining.map((u) => u.email).join(", ") || "(none)"}`,
  );
}

main()
  .catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
