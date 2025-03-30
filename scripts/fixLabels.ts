import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });
// Load environment variables

async function fixLabels() {
  const uri = process.env.MONGODB_URI!;

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("react-web-app");
    const collections = ["items-development", "items-production"];

    for (const collectionName of collections) {
      console.log(`\nProcessing collection: ${collectionName}`);
      const itemsCollection = db.collection(collectionName);

      // Find all items where Labels column value has type Dropdown
      const updateResult = await itemsCollection.updateMany(
        { values: { $elemMatch: { columnName: "Labels", type: "dropdown" } } },
        { $set: { "values.$.type": "text" } }
      );

      console.log(
        `Modified ${updateResult.modifiedCount} items in ${collectionName}`
      );
    }

    console.log("\nSuccessfully updated Labels column type for all items");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

// Execute the function
fixLabels().catch(console.error);
