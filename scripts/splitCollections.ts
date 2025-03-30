import { MongoClient } from "mongodb";
import { Board, WeeklyScheduleData, Item } from "../typings/types.ts";
import dotenv from "dotenv";

dotenv.config();

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://Backend:2nywFe9Nh76OsynP@sharedcluster.ftf6xg6.mongodb.net/?retryWrites=true&w=majority&appName=SharedCluster";
console.log(uri);
const sourceDbName = "react-web-app";
const sourceCollection = "production";

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
    const itemsCollection = db.collection<Item>("items-production");
    const schedulesCollection = db.collection<WeeklyScheduleData>(
      "weeklySchedules-production"
    );

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
      const schedules: WeeklyScheduleData[] = Object.entries(
        board.weeklySchedules
      )
        .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
        .map(([weekKey, schedule]) => ({
          weekKey,
          schedule: schedule as WeeklyScheduleData,
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
