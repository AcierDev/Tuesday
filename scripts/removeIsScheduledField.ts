import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI!;

async function removeIsScheduledField() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("react-web-app");
    const itemsCollection = db.collection("items-production");

    // Find all items that have the isScheduled field
    const result = await itemsCollection.updateMany(
      { isScheduled: { $exists: true } },
      { $unset: { isScheduled: "" } }
    );

    console.log(`Modified ${result.modifiedCount} documents`);
    console.log(`Matched ${result.matchedCount} documents`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

removeIsScheduledField();
