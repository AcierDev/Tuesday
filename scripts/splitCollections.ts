import { MongoClient } from "mongodb";
import { Board } from "../typings/types.ts";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const sourceDbName = "react-web-app";
const sourceCollection = "development";

async function splitCollections() {
  try {
    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(sourceDbName);

    // Get the source board
    const boardsCollection = db.collection<Board>(sourceCollection);
    const board = await boardsCollection.findOne({});

    if (!board) {
      throw new Error("No board found in development collection");
    }

    // Create new collections
    const itemsCollection = db.collection("items-development");
    const schedulesCollection = db.collection("weeklySchedules-development");

    // Insert all items with additional metadata
    if (board.items_page?.items) {
      const itemsWithMetadata = board.items_page.items.map((item) => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await itemsCollection.deleteMany({});
      await itemsCollection.insertMany(itemsWithMetadata);
      console.log(
        `Inserted ${itemsWithMetadata.length} items into items-development`
      );
    }

    // Insert weekly schedules with metadata
    if (board.weeklySchedules) {
      const schedulesWithMetadata = {
        ...board.weeklySchedules,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await schedulesCollection.deleteMany({});
      await schedulesCollection.insertOne(schedulesWithMetadata);
      console.log("Inserted weekly schedules into weeklySchedules-development");
    }

    console.log("Migration completed successfully");
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

splitCollections();
