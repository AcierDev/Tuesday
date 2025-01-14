import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function processExistingLabels() {
  try {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error("NEXT_PUBLIC_APP_URL environment variable is not set");
    }

    console.log("Starting to process existing labels...");

    const startTime = Date.now();

    const response = await fetch(
      `/api/shipping/tracker/1234567890?carrier=USPS`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to process: ${response.statusText}\n${errorText}`
      );
    }

    const results = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\nProcessing Results:");
    console.log("------------------");
    console.log(`Total Orders: ${results.total}`);
    console.log(`Successfully Processed: ${results.processed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Duration: ${duration} seconds`);

    console.log("\nDetailed Results:");
    console.log("----------------");
    results.details.forEach((detail: any) => {
      if (detail.status === "success") {
        console.log(
          `✅ Order ${detail.orderId}: ${detail.carrier} - ${detail.tracking}`
        );
      } else {
        console.log(`❌ Order ${detail.orderId}: ${detail.error}`);
      }
    });

    // Summary
    if (results.failed > 0) {
      console.log(
        "\nWarning: Some orders failed to process. Check the details above."
      );
      process.exit(1);
    } else {
      console.log("\nSuccess: All orders processed successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("\nError processing existing labels:", error);
    process.exit(1);
  }
}

processExistingLabels();
