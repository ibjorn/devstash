import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_USER_EMAIL } from "../src/lib/db/demo-user";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "12345678";

async function main() {
  console.log("Testing database connection...\n");

  const [result] = await prisma.$queryRaw<
    { version: string }[]
  >`SELECT version()`;
  console.log(`✅ Connected: ${result.version}\n`);

  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
  });
  console.log(`✅ System item types (${systemTypes.length}):`);
  console.table(
    systemTypes.map((t) => ({ name: t.name, icon: t.icon, color: t.color }))
  );

  const [users, items, collections, tags] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.collection.count(),
    prisma.tag.count(),
  ]);
  console.log("✅ Row counts:");
  console.table([{ users, items, collections, tags }]);

  // ---------- Seeded demo data ----------

  const demoUser = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });
  if (!demoUser) {
    throw new Error(`Demo user ${DEMO_USER_EMAIL} not found — run \`npm run db:seed\` first`);
  }
  console.log("✅ Demo user:");
  console.table([
    {
      email: demoUser.email,
      name: demoUser.name,
      isPro: demoUser.isPro,
      emailVerified: demoUser.emailVerified?.toISOString() ?? null,
      password: demoUser.password ? `${demoUser.password.slice(0, 16)}…` : null,
    },
  ]);

  if (!demoUser.password || !(await bcrypt.compare(DEMO_PASSWORD, demoUser.password))) {
    throw new Error("Demo user password hash does not match the seeded password");
  }
  console.log(`✅ Password hash verifies against "${DEMO_PASSWORD}"\n`);

  const demoCollections = await prisma.collection.findMany({
    where: { userId: demoUser.id },
    orderBy: { name: "asc" },
    include: {
      items: {
        include: { item: { include: { itemType: true } } },
        orderBy: { addedAt: "asc" },
      },
    },
  });
  console.log(`✅ Demo collections (${demoCollections.length}):`);
  for (const collection of demoCollections) {
    console.log(
      `\n  📁 ${collection.name} — ${collection.description ?? ""} (${collection.items.length} items)${collection.isFavorite ? " ⭐" : ""}`
    );
    console.table(
      collection.items.map(({ item }) => ({
        title: item.title,
        type: item.itemType.name,
        contentType: item.contentType,
        language: item.language ?? "",
        url: item.url ?? "",
        favorite: item.isFavorite,
        pinned: item.isPinned,
      }))
    );
  }

  const demoItemCount = await prisma.item.count({
    where: { userId: demoUser.id },
  });
  console.log(`✅ Demo items total: ${demoItemCount}`);

  console.log("\nDatabase test passed 🎉");
}

main()
  .catch((e) => {
    console.error("❌ Database test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
