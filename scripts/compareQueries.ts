import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI!;

interface TimingResult {
  min: number;
  max: number;
  avg: number;
  median: number;
}

function calculateStats(times: number[]): TimingResult {
  if (times.length === 0) {
    throw new Error("Cannot calculate stats for empty array");
  }

  const sortedTimes = [...times].sort((a, b) => a - b);
  return {
    min: sortedTimes[0]!,
    max: sortedTimes[sortedTimes.length - 1]!,
    avg: times.reduce((a, b) => a + b) / times.length,
    median: sortedTimes[Math.floor(sortedTimes.length / 2)]!,
  };
}

async function runTimingTest() {
  const client = new MongoClient(uri);
  const trials = 10; // Number of trials for each query type

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("react-web-app");
    const developmentCollection = db.collection("development");
    const itemsCollection = db.collection("items-development");

    // Arrays to store timing results
    const findOneTimes: number[] = [];
    const findTimes: number[] = [];

    console.log(`Running ${trials} trials for each query type...\n`);

    // Run trials
    for (let i = 0; i < trials; i++) {
      // Time findOne query
      const findOneStart = performance.now();
      await developmentCollection.findOne({});
      const findOneEnd = performance.now();
      findOneTimes.push(findOneEnd - findOneStart);

      // Time find query
      const findStart = performance.now();
      await itemsCollection
        .find({
          visible: true,
          deleted: false,
          status: { $nin: ["Done", "Hidden"] },
        })
        .toArray();
      const findEnd = performance.now();
      findTimes.push(findEnd - findStart);

      // Small delay between trials
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Calculate statistics
    const findOneStats = calculateStats(findOneTimes);
    const findStats = calculateStats(findTimes);

    // Print results
    console.log("Results (in milliseconds):\n");

    console.log("development.findOne({}):");
    console.log(`  Min: ${findOneStats.min.toFixed(2)}`);
    console.log(`  Max: ${findOneStats.max.toFixed(2)}`);
    console.log(`  Avg: ${findOneStats.avg.toFixed(2)}`);
    console.log(`  Median: ${findOneStats.median.toFixed(2)}\n`);

    console.log("items-development.find():");
    console.log(`  Min: ${findStats.min.toFixed(2)}`);
    console.log(`  Max: ${findStats.max.toFixed(2)}`);
    console.log(`  Avg: ${findStats.avg.toFixed(2)}`);
    console.log(`  Median: ${findStats.median.toFixed(2)}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

runTimingTest();
