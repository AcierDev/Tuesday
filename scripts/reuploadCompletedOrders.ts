import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI!;

async function reuploadCompletedOrders() {
  const client = new MongoClient(uri);

  try {
    // Read the production.json file
    const productionData = JSON.parse(
      await fs.readFile(path.join(__dirname, "production.json"), "utf-8")
    );

    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("react-web-app");
    const itemsCollection = db.collection("items-production");

    // Extract completed items from the first board
    const completedItems = productionData[0].items_page.items.filter(
      (item: any) => item.status === "Done"
    );

    console.log(`Found ${completedItems.length} completed items to reupload`);

    if (completedItems.length === 0) {
      console.log("No completed items found to reupload");
      return;
    }

    // Add index field to each item based on completedAt timestamp
    const sortedItems = completedItems
      .filter((item: any) => item.completedAt)
      .sort((a: any, b: any) => b.completedAt - a.completedAt);

    const itemsWithIndex = sortedItems.map((item: any, index: number) => ({
      ...item,
      index,
      boardId: productionData[0]._id,
    }));

    // Insert the items into items-production collection
    const result = await itemsCollection.insertMany(itemsWithIndex);

    console.log(
      `Successfully reuploaded ${result.insertedCount} completed items`
    );
    console.log("Insertion details:", {
      acknowledged: result.acknowledged,
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

reuploadCompletedOrders();
