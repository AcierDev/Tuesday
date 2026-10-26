import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient, type IndexSpecification } from "mongodb";

// Creates the indexes the planner + stats routes rely on. Idempotent:
// createIndex is a no-op when an identical index already exists.
//
// Run manually (NOT run by the app):
//   npx tsx scripts/ensure-indexes-planner-stats.ts            # dry run
//   npx tsx scripts/ensure-indexes-planner-stats.ts --apply    # create
//
// Unique indexes are skipped (with a report) while duplicate keys exist —
// resolve those docs first, then re-run.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DB_NAME = "react-web-app";
const DUPLICATE_SAMPLE_LIMIT = 10;

type IndexPlan = {
  collection: string;
  key: IndexSpecification & Record<string, 1 | -1>;
  name: string;
  unique?: boolean;
  why: string;
};

function plans(mode: string): IndexPlan[] {
  return [
    {
      collection: `weeklySchedules-${mode}`,
      key: { weekKey: 1 },
      name: "weekKey_unique",
      unique: true,
      why: "POST /api/weekly-schedules upserts by weekKey; one doc per week",
    },
    {
      collection: `activities-${mode}`,
      key: { type: 1, itemId: 1 },
      name: "type_itemId",
      why: "/api/stats/glued: full status history of scheduled items",
    },
    {
      collection: `activities-${mode}`,
      key: { timestamp: 1 },
      name: "timestamp",
      why: "/api/stats/glued window floor; /api/activities sort",
    },
    {
      collection: `items-${mode}`,
      key: { id: 1 },
      name: "id",
      why: "/api/stats/glued item lookup by id",
    },
    {
      collection: `debt-snapshots-${mode}`,
      key: { date: 1 },
      name: "date_unique",
      unique: true,
      why: "one debt snapshot per LA day (page + cron upserts)",
    },
    {
      collection: `backlog-snapshots-${mode}`,
      key: { date: 1 },
      name: "date_unique",
      unique: true,
      why: "one backlog snapshot per LA day (page + cron upserts)",
    },
    {
      collection: `health-snapshots-${mode}`,
      key: { date: 1 },
      name: "date_unique",
      unique: true,
      why: "one health snapshot per LA day (cron upserts)",
    },
  ];
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚀 MAIN                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

async function main() {
  const uri = process.env.MONGODB_URI;
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!uri || !mode) throw new Error("MONGODB_URI and NEXT_PUBLIC_MODE are required");
  const apply = process.argv.includes("--apply");

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    for (const plan of plans(mode)) {
      const label = `${plan.collection} ${JSON.stringify(plan.key)}${plan.unique ? " unique" : ""}`;
      const collection = db.collection(plan.collection);

      if (plan.unique) {
        const fields = Object.keys(plan.key);
        const duplicates = await collection
          .aggregate([
            {
              $group: {
                _id: Object.fromEntries(fields.map((f) => [f, `$${f}`])),
                count: { $sum: 1 },
              },
            },
            { $match: { count: { $gt: 1 } } },
            { $limit: DUPLICATE_SAMPLE_LIMIT },
          ])
          .toArray();
        if (duplicates.length > 0) {
          console.warn(`SKIP ${label}: duplicate keys exist (showing up to ${DUPLICATE_SAMPLE_LIMIT}):`);
          for (const dup of duplicates) {
            console.warn(`   ${JSON.stringify(dup._id)} × ${dup.count}`);
          }
          continue;
        }
      }

      if (!apply) {
        console.log(`would create ${label} — ${plan.why}`);
        continue;
      }
      try {
        const name = await collection.createIndex(plan.key, {
          name: plan.name,
          unique: plan.unique ?? false,
        });
        console.log(`ok ${label} → ${name}`);
      } catch (error) {
        // e.g. the same key already indexed under another name/options.
        console.warn(`FAILED ${label}:`, error instanceof Error ? error.message : error);
      }
    }
    if (!apply) console.log("\nDry run. Re-run with --apply to create indexes.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
