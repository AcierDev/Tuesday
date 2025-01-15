import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import { Board, Item } from "@/typings/types";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function processLabel(
  baseUrl: string,
  labelFilename: string,
  item: Item
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds

  try {
    // Extract tracking info from PDF
    const formData = new FormData();
    const labelResponse = await fetch(
      `${baseUrl}/api/shipping/pdf/${labelFilename}`
    );
    const labelBlob = await labelResponse.blob();
    formData.append("label", labelBlob, labelFilename);

    const trackingResponse = await fetch(
      `${baseUrl}/api/shipping/extract-tracking`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }
    );

    if (!trackingResponse.ok) {
      throw new Error(`Failed to extract tracking info from ${labelFilename}`);
    }

    const trackingInfo = await trackingResponse.json();
    console.log(`Customer Name: ${item.values[0].text}`);
    console.log("Tracking Info:");
    console.log(trackingInfo);

    // Get tracker info
    const trackerResponse = await fetch(
      `${baseUrl}/api/shipping/tracker/${trackingInfo.trackingNumber}?carrier=${trackingInfo.carrier}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!trackerResponse.ok) {
      throw new Error(
        `Failed to get tracker for ${trackingInfo.trackingNumber}`
      );
    }

    const trackerData = await trackerResponse.json();

    // Save tracking info
    const saveResponse = await fetch(`${baseUrl}/api/order-tracking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: item.id.toString(),
        trackers: [trackerData],
      }),
    });

    if (!saveResponse.ok) {
      throw new Error(`Failed to save tracking info for order ${item.id}`);
    }

    console.log(
      `Successfully processed label ${labelFilename} for order ${item.id}`
    );
    return true;
  } catch (error) {
    console.error(`Error processing label ${labelFilename}:`, error);
    return false;
  }
}

// Add this helper function for processing chunks in parallel
async function processChunk(
  items: Item[],
  labelsData: Record<string, string[]>,
  baseUrl: string,
  concurrency: number
) {
  const chunks = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }

  let successfulOrders = 0;
  let processedOrders = 0;

  for (const chunk of chunks) {
    const promises = chunk.map(async (item) => {
      const orderLabels = labelsData[item.id] || [];

      if (orderLabels.length === 0) {
        return null;
      }

      processedOrders++;
      console.log(
        `Processing ${orderLabels.length} labels for order ${item.id}`
      );

      // Process all labels for an order in parallel
      const labelResults = await Promise.all(
        orderLabels.map((labelFilename) =>
          processLabel(baseUrl, labelFilename, item)
        )
      );

      if (labelResults.every((success) => success)) {
        successfulOrders++;
        return true;
      }
      return false;
    });

    // Wait for the current chunk to complete before moving to the next
    await Promise.all(promises);

    // Small delay between chunks to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { successfulOrders, processedOrders };
}

// Update the main function
async function processExistingLabels() {
  try {
    let baseUrl = "http://localhost:3000";
    console.log("Starting to process existing labels...");
    console.log(`Using API URL: ${baseUrl}`);

    const startTime = Date.now();
    const CONCURRENCY = 5; // Process 5 orders at a time

    try {
      const client = new MongoClient(process.env.MONGODB_URI!);
      await client.connect();
      const db = client.db("react-web-app");
      const collection = db.collection<Board>("production");

      // First, get all orders
      const boards = await collection.find({}).toArray();
      const items = boards[0].items_page.items;
      console.log(`Found ${items.length} total orders to process`);

      // Get all existing labels
      const labelsResponse = await fetch(`${baseUrl}/api/shipping/pdfs`);
      const labelsList = await labelsResponse.json();

      // Transform the array of filenames into a map of order IDs to labels
      const labelsData: Record<string, string[]> = {};
      labelsList.forEach((filename: string) => {
        if (filename.startsWith("deleted_")) return;

        const match = filename.match(/^(\d+)(?:-\d+)?\.pdf$/);
        if (match) {
          const orderId = match[1];
          if (!labelsData[orderId]) {
            labelsData[orderId] = [];
          }
          labelsData[orderId].push(filename);
        }
      });

      console.log("\nTransformed Labels Data:");
      console.log(JSON.stringify(labelsData, null, 2));

      // Process items in parallel with controlled concurrency
      const { successfulOrders, processedOrders } = await processChunk(
        items,
        labelsData,
        baseUrl,
        CONCURRENCY
      );

      console.log(`\nProcessing Summary:`);
      console.log(`- Total orders: ${items.length}`);
      console.log(`- Orders with labels: ${processedOrders}`);
      console.log(`- Successfully processed orders: ${successfulOrders}`);
      console.log(`- Orders without labels: ${items.length - processedOrders}`);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nDuration: ${duration} seconds`);

      process.exit(0);
    } catch (error) {
      console.error("\nConnection Error Details:");
      console.error(`- URL attempted: ${baseUrl}`);
      console.error(
        `- Error: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("\nTroubleshooting steps:");
      console.error("1. Verify the server is running");
      console.error("2. Check if the port 3000 is open");
      console.error("3. Try using HTTP instead of HTTPS");
      console.error("4. Verify the IP address is correct");
      console.error(
        "5. Check if the server is accessible from your current network"
      );
      throw error;
    }
  } catch (error) {
    console.error("\nError processing existing labels:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

processExistingLabels();
