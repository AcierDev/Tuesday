import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import EasyPost from "@easypost/api";
import { OrderTrackingInfo, Tracker } from "@/typings/types";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const DRY_RUN = false; // Set to false to actually update the database

async function recoverEasyPostTrackers() {
  const mongoUri = process.env.MONGODB_URI;
  const easyPostApiKey = process.env.EASYPOST_API_KEY;

  if (!mongoUri || !easyPostApiKey) {
    console.error("Missing MONGODB_URI or EASYPOST_API_KEY env vars");
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  // @ts-ignore
  const easyPost = new EasyPost(easyPostApiKey);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db("react-web-app");
    const collectionName = `trackers-${process.env.NEXT_PUBLIC_MODE || "production"}`;
    const collection = db.collection<OrderTrackingInfo>(collectionName);

    console.log(`Scanning collection: ${collectionName}`);
    console.log(`Dry Run Mode: ${DRY_RUN ? "ENABLED (No changes will be saved)" : "DISABLED (Changes WILL be saved)"}`);

    const cursor = collection.find({});
    const totalDocs = await collection.countDocuments();
    let processed = 0;
    let updated = 0;
    let errors = 0;

    console.log(`Found ${totalDocs} tracking records.`);

    for await (const doc of cursor) {
      processed++;
      const { orderId, trackers } = doc;

      if (!trackers || trackers.length === 0) {
        console.log(`[${processed}/${totalDocs}] Order ${orderId}: No trackers found.`);
        continue;
      }

      console.log(`[${processed}/${totalDocs}] Order ${orderId}: Processing ${trackers.length} trackers...`);

      const updatedTrackers: Tracker[] = [];
      let docNeedsUpdate = false;

      for (const tracker of trackers) {
        try {
          if (tracker.tracking_details && tracker.tracking_details.length > 1) {
            // console.log(`  -> Tracker ${tracker.id} has > 1 details. Skipping.`);
            updatedTrackers.push(tracker);
            continue;
          }

            // @ts-ignore
          const remoteTracker = await easyPost.Tracker.retrieve(tracker.id);
          
          if (remoteTracker) {
            // Check if status is different or if there are new details
            if (remoteTracker.status !== tracker.status || 
                remoteTracker.updated_at !== tracker.updated_at) {
                docNeedsUpdate = true;
                // console.log(`  -> Tracker ${tracker.id} updated: ${tracker.status} -> ${remoteTracker.status}`);
            }
            // Use the remote tracker data
             // @ts-ignore
            updatedTrackers.push(remoteTracker as Tracker);
          } else {
             console.warn(`  -> Tracker ${tracker.id} not found on EasyPost. Keeping existing data.`);
             updatedTrackers.push(tracker);
          }
          
        } catch (err: any) {
          console.error(`  -> Error fetching tracker ${tracker.id}: ${err.message}`);
          updatedTrackers.push(tracker); // Keep existing if fetch fails
          errors++;
        }
        // EasyPost rate limit handling (janky but effective for scripts)
        await new Promise(r => setTimeout(r, 200)); 
      }

      if (docNeedsUpdate) {
         updated++;
         if (!DRY_RUN) {
             await collection.updateOne(
                 { _id: doc._id },
                 { $set: { trackers: updatedTrackers } }
             );
             console.log(`  -> Saved updates for Order ${orderId}`);
         } else {
             console.log(`  -> [DRY RUN] Would update Order ${orderId}`);
         }
      } else {
          // console.log(`  -> No changes for Order ${orderId}`);
      }
    }

    console.log("\nRecovery Complete!");
    console.log(`Total Processed: ${processed}`);
    console.log(`Documents Updated: ${updated}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await client.close();
  }
}

recoverEasyPostTrackers();
