// Marks orders whose name carries "(vertical)" but whose saved flag says
// horizontal (the original order form saved isVertical: false on every order)
// as vertical, so the saved flag and the name agree.
//
//   npx tsx scripts/backfill-vertical-tags.ts           # dry run (default): report only
//   npx tsx scripts/backfill-vertical-tags.ts --apply   # write the changes
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DB_NAME = "react-web-app";
const APPLY_FLAG = "--apply";
// How many matching orders a run lists by name.
const SAMPLE_SIZE = 25;
// Same exact tag lib/order-orientation.ts treats as vertical.
const VERTICAL_TAG_FILTER = { $regex: "\\(vertical\\)", $options: "i" };

const uri = process.env.MONGODB_URI;
const mode = process.env.NEXT_PUBLIC_MODE;

if (!uri) {
  console.error("MONGODB_URI not set — check .env.local");
  process.exit(1);
}
if (!mode) {
  console.error("NEXT_PUBLIC_MODE not set — check .env.local");
  process.exit(1);
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG);
  const client = new MongoClient(uri!);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(`items-${mode}`);
    const filter = { customerName: VERTICAL_TAG_FILTER, "tags.isVertical": false };

    const matching = await collection.countDocuments(filter);
    const sample = await collection
      .find(filter, { projection: { _id: 0, id: 1, customerName: 1, status: 1 } })
      .limit(SAMPLE_SIZE)
      .toArray();

    console.log(`items-${mode}: ${matching} order(s) have "(vertical)" in the name but tags.isVertical: false`);
    for (const item of sample) {
      console.log(`  ${item.id}  [${item.status}]  ${item.customerName}`);
    }
    if (matching > sample.length) console.log(`  … and ${matching - sample.length} more`);

    if (!apply) {
      console.log(`Dry run — nothing written. Re-run with ${APPLY_FLAG} to set tags.isVertical: true.`);
      return;
    }

    const result = await collection.updateMany(filter, { $set: { "tags.isVertical": true } });
    console.log(`Updated ${result.modifiedCount} of ${result.matchedCount} matching order(s).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
