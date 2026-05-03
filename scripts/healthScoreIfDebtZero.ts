import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

import { Item } from "@/typings/types";
import { computeHealthScore } from "@/lib/production-metrics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const DB_NAME = "react-web-app";
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

function fmtRow(label: string, before: number, after: number, weight: number) {
  const diff = after - before;
  const arrow = diff > 0.05 ? " ↑" : diff < -0.05 ? " ↓" : "  ";
  return `  ${label.padEnd(18)} ${before.toFixed(1).padStart(5)} → ${after.toFixed(1).padStart(5)} / ${weight.toString().padStart(3)}${arrow}`;
}

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const items = await db
      .collection<Item>(`items-${mode}`)
      .find(
        { visible: true, deleted: false },
        {
          projection: {
            id: 1,
            status: 1,
            dueDate: 1,
            createdAt: 1,
            completedAt: 1,
            design: 1,
            size: 1,
          },
        }
      )
      .toArray();
    console.log(`Loaded ${items.length} items (mode=${mode})`);

    const current = computeHealthScore(items);
    const projectedNow = computeHealthScore(items, {
      simulateDebtCleared: true,
    });
    const projected1w = computeHealthScore(items, {
      sustainedDebtFreeDays: 7,
    });
    const projected2w = computeHealthScore(items, {
      sustainedDebtFreeDays: 14,
    });
    const projected4w = computeHealthScore(items, {
      sustainedDebtFreeDays: 30,
    });
    const projected20w = computeHealthScore(items, {
      sustainedDebtFreeDays: 140,
    });

    const fmtDelta = (n: number) =>
      `${n > 0 ? "+" : ""}${n} pts`;

    console.log();
    console.log(`Current health:                ${current.total} / 100`);
    console.log(
      `If debt cleared (now):         ${projectedNow.total} / 100  (${fmtDelta(projectedNow.total - current.total)})`
    );
    console.log(
      `+ debt-free for 1 week:        ${projected1w.total} / 100  (${fmtDelta(projected1w.total - current.total)})`
    );
    console.log(
      `+ debt-free for 2 weeks:       ${projected2w.total} / 100  (${fmtDelta(projected2w.total - current.total)})`
    );
    console.log(
      `+ debt-free for 4 weeks:       ${projected4w.total} / 100  (${fmtDelta(projected4w.total - current.total)})`
    );
    console.log(
      `+ debt-free for 20 weeks:      ${projected20w.total} / 100  (${fmtDelta(projected20w.total - current.total)})`
    );
    console.log();
    console.log(
      "Per-component (current → now → 1w → 2w → 4w → 20w / weight):"
    );
    for (let i = 0; i < current.breakdown.length; i++) {
      const b = current.breakdown[i]!;
      const n = projectedNow.breakdown[i]!;
      const w1 = projected1w.breakdown[i]!;
      const w2 = projected2w.breakdown[i]!;
      const w4 = projected4w.breakdown[i]!;
      const w20 = projected20w.breakdown[i]!;
      console.log(
        `  ${b.label.padEnd(18)} ${b.earned.toFixed(1).padStart(5)} → ${n.earned.toFixed(1).padStart(5)} → ${w1.earned.toFixed(1).padStart(5)} → ${w2.earned.toFixed(1).padStart(5)} → ${w4.earned.toFixed(1).padStart(5)} → ${w20.earned.toFixed(1).padStart(5)} / ${b.weight.toString().padStart(3)}`
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
