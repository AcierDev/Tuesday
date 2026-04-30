import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const uri = process.env.MONGODB_URI;
const DB_NAME = "react-web-app";

if (!uri) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

async function downloadDatabases() {
  const client = new MongoClient(uri!, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);

    const allCollections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collections = allCollections
      .map((c) => ({ name: c.name, filename: `${sanitizeFilename(c.name)}.json` }))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Discovered ${collections.length} collections in '${DB_NAME}'`);

    const downloadsDir = path.join(os.homedir(), "Downloads");
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
    const tzAbbr = parts.timeZoneName.replace(/\s+/g, "");
    const timestamp = `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}-${tzAbbr}`;
    const outputDir = path.join(
      downloadsDir,
      `everwood-database-backup-${timestamp}`
    );

    // Create output directory if it doesn't exist
    try {
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    } catch (error) {
      console.log(`Output directory already exists: ${outputDir}`);
    }

    const results: Array<{ name: string; filename: string; documentCount: number; bytes: number; ok: boolean; error?: string }> = [];

    for (const { name, filename } of collections) {
      try {
        console.log(`\nDownloading collection: ${name}`);

        const collection = db.collection(name);
        const documents = await collection.find({}).toArray();

        console.log(`Found ${documents.length} documents in ${name}`);

        const exportData = {
          metadata: {
            collection: name,
            exportDate: new Date().toISOString(),
            documentCount: documents.length,
            database: DB_NAME,
          },
          data: documents,
        };

        const outputPath = path.join(outputDir, filename);
        await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
        const bytes = (await fs.stat(outputPath)).size;

        console.log(`✓ Saved ${name} → ${outputPath} (${bytes} bytes)`);
        results.push({ name, filename, documentCount: documents.length, bytes, ok: true });
      } catch (error: any) {
        console.error(`✗ Error downloading collection ${name}:`, error);
        results.push({ name, filename, documentCount: 0, bytes: 0, ok: false, error: String(error?.message ?? error) });
      }
    }

    const manifestPath = path.join(outputDir, "manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          database: DB_NAME,
          collectionCount: collections.length,
          collections: results,
        },
        null,
        2
      )
    );

    const summaryPath = path.join(outputDir, "backup-summary.txt");
    const failures = results.filter((r) => !r.ok);
    const totalDocs = results.reduce((sum, r) => sum + r.documentCount, 0);
    const totalBytes = results.reduce((sum, r) => sum + r.bytes, 0);
    const summary = `
Everwood Database Backup Summary
================================
Export Date: ${new Date().toISOString()}
Database: ${DB_NAME}
Collections Discovered: ${collections.length}
Collections Succeeded: ${results.length - failures.length}
Collections Failed: ${failures.length}
Total Documents: ${totalDocs}
Total Bytes: ${totalBytes}

Collections:
${results.map((r) => `- ${r.ok ? "✓" : "✗"} ${r.name} (${r.documentCount} docs, ${r.bytes} bytes)${r.error ? ` — ${r.error}` : ""}`).join("\n")}

Location: ${outputDir}

This backup discovers every collection in the database dynamically, so any
new collection added later is automatically included. Each JSON file is a
self-describing export with metadata + data, restorable via scripts/restore-data.ts.
    `.trim();

    await fs.writeFile(summaryPath, summary);
    console.log(`\n✓ Created backup summary: ${summaryPath}`);
    console.log(`✓ Created manifest: ${manifestPath}`);

    if (failures.length > 0) {
      console.error(`\n⚠ Backup completed with ${failures.length} failure(s):`);
      for (const f of failures) console.error(`  - ${f.name}: ${f.error}`);
      console.log(`📁 Files saved to: ${outputDir}`);
      process.exit(1);
    }

    console.log(`\n🎉 Database backup completed successfully!`);
    console.log(`📁 All files saved to: ${outputDir}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

downloadDatabases().catch(console.error);
