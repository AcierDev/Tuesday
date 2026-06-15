// Discovery: list every collection in react-web-app with doc counts + storage size.
// Read-only. Loads MONGODB_URI from .env.local.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
const { MongoClient } = require("mongodb");

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri, { connectTimeoutMS: 8000, socketTimeoutMS: 30000 });
  await client.connect();
  const db = client.db("react-web-app");
  const cols = await db.listCollections().toArray();
  let totalDocs = 0;
  const rows = [];
  for (const c of cols) {
    if (c.type === "view") { rows.push([c.name, "view", "-"]); continue; }
    const count = await db.collection(c.name).estimatedDocumentCount();
    totalDocs += count;
    rows.push([c.name, count, ""]);
  }
  rows.sort((a, b) => (typeof b[1] === "number" ? b[1] : -1) - (typeof a[1] === "number" ? a[1] : -1));
  console.log("COLLECTION".padEnd(40), "DOCS");
  for (const [name, count] of rows) console.log(String(name).padEnd(40), count);
  console.log("-".repeat(50));
  console.log("collections:", cols.length, "| total docs:", totalDocs);
  await client.close();
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
