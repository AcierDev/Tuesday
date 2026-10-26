import { MongoClient } from "mongodb";
import { lazyPromise, retryingConnection, type PromiseSlot } from "./retrying-connection";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 50,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
};

// Development keeps the attempt on `global` so hot reloads reuse one client.
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};
let processClientPromise: Promise<MongoClient> | undefined;
const slot: PromiseSlot<MongoClient> = process.env.NODE_ENV === "development"
  ? { get: () => globalWithMongo._mongoClientPromise, set: (promise) => { globalWithMongo._mongoClientPromise = promise; } }
  : { get: () => processClientPromise, set: (promise) => { processClientPromise = promise; } };

const getClientPromise = retryingConnection(() => {
  const client = new MongoClient(uri, options);
  const connecting = client.connect();
  connecting.catch(() => client.close().catch(() => undefined));
  return connecting;
}, slot);

// Start connecting at load, as before; a failure here is retried on next use.
void getClientPromise().catch(() => undefined);

const clientPromise: Promise<MongoClient> = lazyPromise(getClientPromise);

// Add connection management functions
export async function closeConnection() {
  const client = await clientPromise;
  await client.close();
}

export async function getDb() {
  const client = await clientPromise;
  return client.db("react-web-app");
}

export default clientPromise;
