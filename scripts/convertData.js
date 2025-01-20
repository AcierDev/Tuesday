const { MongoClient } = require("mongodb");
const fs = require("fs").promises;
const path = require("path");

// MongoDB connection URI - replace with your actual connection string
const uri =
  "mongodb+srv://temp:gxFfQcLFBQY8nJmf@sharedcluster.ftf6xg6.mongodb.net/?retryWrites=true&w=majority&appName=SharedCluster";
const dbName = "react-web-app";
const collectionName = "production";

async function migrateData() {
  try {
    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Find all boards
    const boards = await collection.find({}).toArray();

    for (const board of boards) {
      if (!board.items_page?.items) continue;

      let hasUpdates = false;
      const updatedItems = board.items_page.items.map((item) => {
        if (item.vertical === true) {
          hasUpdates = true;
          // Create tags object if it doesn't exist
          const tags = item.tags || {
            isDifficultCustomer: false,
            isVertical: false,
            hasCustomerMessage: false,
          };

          // Set isVertical tag to true
          tags.isVertical = true;

          // Create new item without vertical field
          const { vertical, ...itemWithoutVertical } = item;
          return {
            ...itemWithoutVertical,
            tags,
          };
        }
        return item;
      });

      if (hasUpdates) {
        // Update the board with migrated items
        await collection.updateOne(
          { _id: board._id },
          {
            $set: {
              "items_page.items": updatedItems,
            },
          }
        );
        console.log(`Updated items in board: ${board.name}`);
      }
    }

    console.log("Migration completed successfully");
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

migrateData();
