import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import os from "os";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI!;

async function downloadDatabases() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000, // 10 second timeout
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("react-web-app");

    // Collections to download
    const collections = [
      { name: "items-development", filename: "items-development.json" },
      { name: "items-production", filename: "items-production.json" },
      { name: "development", filename: "development-boards.json" },
      { name: "production", filename: "production-boards.json" },
    ];

    // Get Downloads directory path with timestamp
    const downloadsDir = path.join(os.homedir(), "Downloads");
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
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

    // Download each collection
    for (const { name, filename } of collections) {
      try {
        console.log(`\nDownloading collection: ${name}`);

        const collection = db.collection(name);
        const documents = await collection.find({}).toArray();

        console.log(`Found ${documents.length} documents in ${name}`);

        // Add metadata to the export
        const exportData = {
          metadata: {
            collection: name,
            exportDate: new Date().toISOString(),
            documentCount: documents.length,
            database: "react-web-app",
          },
          data: documents,
        };

        const outputPath = path.join(outputDir, filename);
        await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));

        console.log(`✓ Successfully saved ${name} to ${outputPath}`);
        console.log(`  File size: ${(await fs.stat(outputPath)).size} bytes`);
      } catch (error) {
        console.error(`✗ Error downloading collection ${name}:`, error);
      }
    }

    // Create a summary file
    const summaryPath = path.join(outputDir, "backup-summary.txt");
    const summary = `
Everwood Database Backup Summary
================================
Export Date: ${new Date().toISOString()}
Database: react-web-app
Collections Exported: ${collections.length}

Collections:
${collections.map((c) => `- ${c.name} → ${c.filename}`).join("\n")}

Location: ${outputDir}

Note: This backup includes both development and production item databases
along with board configurations. Each JSON file contains metadata about
the export including timestamp and document count.
    `.trim();

    await fs.writeFile(summaryPath, summary);
    console.log(`\n✓ Created backup summary: ${summaryPath}`);

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
