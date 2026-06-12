import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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

  console.log("Database test passed 🎉");
}

main()
  .catch((e) => {
    console.error("❌ Database test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
