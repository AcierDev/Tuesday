import { MongoClient } from "mongodb";
import { Board, WeeklyScheduleData, Item } from "../typings/types";
import dotenv from "dotenv";

dotenv.config();

const sourceDbName = "react-web-app";
const sourceCollection = "production";

async function splitCollections() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is required to split collections");
    }

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
    const itemsCollection = db.collection<Item>("items-production");
    const schedulesCollection = db.collection<WeeklyScheduleData>(
      "weeklySchedules-production"
    );

    // Insert all items with additional metadata
    if (board.items_page?.items) {
      const itemsWithMetadata = board.items_page.items.map((item) => ({
        ...item,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      await itemsCollection.deleteMany({});
      await itemsCollection.insertMany(itemsWithMetadata);
      console.log(
        `Inserted ${itemsWithMetadata.length} items into items-development`
      );
    }

    // Insert weekly schedules with metadata
    if (board.weeklySchedules) {
      const schedules: WeeklyScheduleData[] = Object.entries(
        board.weeklySchedules
      )
        .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
        .map(([weekKey, schedule]) => ({
          weekKey,
          schedule: schedule as WeeklyScheduleData["schedule"],
        }));

      await schedulesCollection.deleteMany({});
      await schedulesCollection.insertMany(schedules);
      console.log(
        `Inserted ${schedules.length} weekly schedules into weeklySchedules-development`
      );
    }

    console.log("Migration completed successfully");
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

splitCollections();
