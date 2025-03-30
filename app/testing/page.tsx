"use client";

import { useOrderStore } from "@/stores/useOrderStore";
import { ItemSizes, Item, ItemStatus, ColumnTitles } from "@/typings/types";

export default function TestingPage() {
  // SIZE_MULTIPLIERS from constants.ts - Maps each size to its block count
  const SIZE_MULTIPLIERS: Record<ItemSizes, number> = {
    "14 x 7": 14 * 7,
    "16 x 6": 16 * 6,
    "16 x 10": 16 * 10,
    "20 x 10": 20 * 10,
    "24 x 10": 24 * 10,
    "20 x 12": 20 * 12,
    "24 x 12": 24 * 12,
    "28 x 12": 28 * 12,
    "28 x 16": 28 * 16,
    "32 x 16": 32 * 16,
    "36 x 16": 36 * 16,
    "19 x 10": 19 * 10,
    "22 x 10": 22 * 10,
    "36 x 15": 36 * 15,
    "19 x 11": 19 * 11,
    "22 x 11": 22 * 11,
    "27 x 11": 27 * 11,
    "27 x 15": 27 * 15,
    "13 x 10": 13 * 10,
    "23 x 12": 23 * 12,
    "20 x 8": 20 * 8,
    "14 x 27": 14 * 27,
    "28 x 6": 28 * 6,
    "14x27": 14 * 27,
    "30 x 12": 30 * 12,
    "42 x 15": 42 * 15,
    "28x16": 28 * 16,
  };

  /**
   * Parses an item size string and returns the block count
   * If the size matches a standard size, returns the multiplier
   * Otherwise returns null
   */
  function getBlocksFromSize(sizeStr: string | undefined): number | null {
    if (!sizeStr) return null;

    // Check if it's a standard size
    if (sizeStr in SIZE_MULTIPLIERS) {
      return SIZE_MULTIPLIERS[sizeStr as ItemSizes];
    }

    // All non-standard sizes should be manually reviewed
    // Including custom dimensions like "44 x 30"
    return null;

    /* Previous custom size parsing logic removed:
    // Try to parse dimensions from a custom size (e.g., "20 x 15")
    const match = sizeStr.match(/(\d+)\s*x\s*(\d+)/i);
    if (match && match.length >= 3) {
      const width = parseInt(match[1], 10);
      const height = parseInt(match[2], 10);
      if (!isNaN(width) && !isNaN(height)) {
        return width * height;
      }
    }
    */
  }

  /**
   * Checks if a date is in Q4 2024 (October-December)
   */
  function isInQ4_2024(timestamp: number): boolean {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed, so 9 = October, 10 = November, 11 = December

    return year === 2024 && month >= 9 && month <= 11;
  }

  /**
   * Generate a report of blocks shipped in Q4 2024
   */
  async function generateQ4BlocksReport() {
    console.log("Generating Q4 2024 Blocks Report...");
    console.log("Fetching completed orders...");

    // Load all orders, including done items
    const orderStore = useOrderStore.getState();
    await orderStore.loadItems();
    const items = await orderStore.loadDoneItems();

    console.log("Items:", items.length);

    // Filter for completed items in Q4 2024
    const q4CompletedItems = items.filter(
      (item) =>
        item.status === ItemStatus.Done &&
        item.completedAt &&
        isInQ4_2024(item.completedAt)
    );

    console.log(`Found ${q4CompletedItems.length} orders completed in Q4 2024`);

    let totalBlocksShipped = 0;
    const nonStandardSizes: Array<{ order: string; size: string }> = [];

    // Process each completed item
    q4CompletedItems.forEach((item) => {
      // Find the size value from the item
      const sizeValue = item.values.find(
        (v) => v.columnName === ColumnTitles.Size
      )?.text;

      // Get customer name for reference
      const customerName =
        item.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
          ?.text || "Unknown";

      // Get order date for logging
      const orderDate = item.completedAt
        ? new Date(item.completedAt).toLocaleDateString()
        : "Unknown date";

      const blocks = getBlocksFromSize(sizeValue);

      if (blocks !== null) {
        // Standard size or parseable custom size
        totalBlocksShipped += blocks;
        console.log(
          `Order for ${customerName} on ${orderDate}: ${sizeValue} = ${blocks} blocks`
        );
      } else if (sizeValue) {
        // Non-standard size that couldn't be parsed
        nonStandardSizes.push({
          order: customerName,
          size: sizeValue,
        });
        console.log(
          `Order for ${customerName} on ${orderDate}: ${sizeValue} - NON-STANDARD SIZE`
        );
      }
    });

    // Print the report
    console.log("\n\n========== Q4 2024 BLOCKS REPORT ==========");
    console.log(`Total Orders Completed: ${q4CompletedItems.length}`);
    console.log(`Total Blocks Shipped: ${totalBlocksShipped}`);

    if (nonStandardSizes.length > 0) {
      console.log("\nNon-Standard Sizes (need manual calculation):");
      nonStandardSizes.forEach((item) => {
        console.log(`- ${item.order}: ${item.size}`);
      });
    }
  }
  return (
    <div>
      <button onClick={generateQ4BlocksReport}>
        Generate Q4 Blocks Report
      </button>
    </div>
  );
}
