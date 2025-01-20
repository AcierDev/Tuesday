const { MongoClient } = require("mongodb");
const fs = require("fs").promises;
const path = require("path");

// MongoDB connection URI - replace with your actual connection string
const uri =
  "mongodb+srv://temp:gxFfQcLFBQY8nJmf@sharedcluster.ftf6xg6.mongodb.net/?retryWrites=true&w=majority&appName=SharedCluster";
const dbName = "react-web-app";
const collectionName = "development";

async function uploadToMongo() {
  try {
    // Read the production.json file
    const data = JSON.parse(
      await fs.readFile(path.join(__dirname, "production.json"), "utf8")
    );

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Clear existing data if needed
    await collection.deleteMany({});
    console.log("Cleared existing data");

    // Insert the data - data is already an array of documents
    const result = await collection.insertMany(data);
    console.log("Data uploaded successfully");
    console.log(`Inserted ${result.insertedCount} documents`);

    await client.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

uploadToMongo();
