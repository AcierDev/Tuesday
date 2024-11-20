// lib/mongodb.ts
import { MongoClient, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongodb URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options = {
  directConnection: true,
  replicaSet: "rs0",
  authSource: "admin",
  retryWrites: true,
  w: "majority",
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 15000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 360000, // 6 minutes
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise
export default clientPromise;

// Helper function to get database instance
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}

// Helper function to check database connection and replica set status
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Check basic connectivity
    await db.command({ ping: 1 });

    // Check replica set status
    const status = await db.command({ replSetGetStatus: 1 });
    console.log("Replica set status:", status.ok === 1 ? "OK" : "Not OK");

    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    return false;
  }
}
