import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI not found in .env");
  process.exit(1);
}

async function removeValuesField(collectionName: string) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`Connected to MongoDB. Processing collection: ${collectionName}`);

    const db = client.db("react-web-app");
    const collection = db.collection(collectionName);

    const result = await collection.updateMany(
      { values: { $exists: true } },
      { $unset: { values: "" } }
    );

    console.log(
      `Collection ${collectionName}: matched ${result.matchedCount}, modified ${result.modifiedCount}`
    );
  } catch (error) {
    console.error(`Error processing ${collectionName}:`, error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function main() {
  const collections = ["items-development", "items-production"];

  for (const name of collections) {
    await removeValuesField(name);
  }

  console.log("✅ Finished removing 'values' field from all target collections.");
}

main().catch((err) => {
  console.error("Unhandled error in remove-values-field script:", err);
  process.exit(1);
});


