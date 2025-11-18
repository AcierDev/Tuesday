import { MongoClient } from "mongodb";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
}

async function upload(filePath: string, collectionName: string) {
    const client = new MongoClient(uri!);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db("react-web-app");
        
        console.log(`Reading ${filePath}...`);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const json = JSON.parse(fileContent);
        const data = json.data;

        if (!data || !Array.isArray(data)) {
            throw new Error("Invalid data format");
        }

        const collection = db.collection(collectionName);
        
        console.log(`Uploading ${data.length} documents to ${collectionName}...`);
        
        // Use bulkWrite for efficiency
        const operations = data.map((item: any) => {
            // Ensure we don't try to update _id if it's immutable, but we usually want to match on 'id' (app logic)
            // Mongo _id is usually an ObjectId. The app uses 'id' (string).
            // If we use updateOne with upsert, we match on 'id'.
            
            // Remove _id from update payload to avoid "immutable field" errors if it exists in backup
            const { _id, ...itemWithoutId } = item;

            return {
                updateOne: {
                    filter: { id: item.id }, 
                    update: { $set: itemWithoutId },
                    upsert: true
                }
            };
        });

        if (operations.length > 0) {
            const result = await collection.bulkWrite(operations);
            console.log(`✓ Processed ${operations.length} items.`);
            console.log(`  Matched: ${result.matchedCount}`);
            console.log(`  Modified: ${result.modifiedCount}`);
            console.log(`  Upserted: ${result.upsertedCount}`);
        } else {
            console.log("No data to upload.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

const filePath = process.argv[2];
const collectionName = process.argv[3];

if (!filePath || !collectionName) {
    console.error("Usage: npx tsx scripts/restore-data.ts <path-to-json> <collection-name>");
    process.exit(1);
}

upload(filePath, collectionName);

