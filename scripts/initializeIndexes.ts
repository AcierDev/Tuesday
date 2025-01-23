import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Item, ItemStatus } from "../typings/types";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI!;

async function initializeIndexes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("react-web-app");
    const collections = ["items-development", "items-production"];

    for (const collectionName of collections) {
      console.log(`\nProcessing collection: ${collectionName}`);
      const itemsCollection = db.collection(collectionName);

      // Get all items grouped by status
      const items = await itemsCollection.find({}).toArray();
      const itemsByStatus = items.reduce((acc, item) => {
        const status = item.status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      // Update each item with its index within its status group
      for (const [status, statusItems] of Object.entries(itemsByStatus)) {
        console.log(
          `Processing ${statusItems.length} items for status: ${status}`
        );

        const updates = statusItems.map((item, index) => ({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { index } },
          },
        }));

        if (updates.length > 0) {
          await itemsCollection.bulkWrite(updates);
        }
      }
    }

    console.log("\nSuccessfully initialized indexes for all items");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

initializeIndexes();
