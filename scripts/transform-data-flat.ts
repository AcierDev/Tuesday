import fs from 'fs';
import path from 'path';

// Field mapping configuration
const COLUMN_MAPPING: Record<string, string> = {
  "Customer Name": "customerName",
  "Due Date": "dueDate",
  "Design": "design",
  "Size": "size",
  "Painted": "painted",
  "Backboard": "backboard",
  "Glued": "glued",
  "Packaging": "packaging",
  "Boxes": "boxes",
  "Notes": "notes",
  "Rating": "rating",
  "Shipping": "shipping",
  "Labels": "labels"
};

function transformItemFully(item: any) {
  const newItem: any = {
    id: item.id,
    index: item.index,
    status: item.status,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    visible: item.visible,
    deleted: item.deleted,
    tags: item.tags,
    shippingDetails: item.shippingDetails,
    isScheduled: item.isScheduled // Preserve if present
  };

  // Extract all values
  if (Array.isArray(item.values)) {
    item.values.forEach((v: any) => {
      const key = COLUMN_MAPPING[v.columnName];
      if (key) {
        // For dropdowns/text, we usually just want the text
        // But some components might rely on other properties like timestamp or credit
        // For O(1) speed, simple key-value is best.
        // If we need metadata (who painted it?), we might need a separate object or complex value.
        // Assuming text content is primary for now based on "I don't want any values array".
        newItem[key] = v.text || "";
      }
    });
  }

  // Search text
  newItem.searchText = Object.values(newItem)
    .filter(val => typeof val === 'string')
    .join(" ")
    .toLowerCase();

  return newItem;
}

const backupDir = process.argv[2];

if (!backupDir) {
  console.error("Please provide the backup directory path as an argument.");
  process.exit(1);
}

const filesToTransform = ['items-development.json', 'items-production.json'];

filesToTransform.forEach(filename => {
  const filePath = path.join(backupDir, filename);
  if (fs.existsSync(filePath)) {
    console.log(`Fully transforming ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    if (json.data && Array.isArray(json.data)) {
      json.data = json.data.map(transformItemFully);
      
      const outputFilename = `flat-${filename}`;
      const outputPath = path.join(backupDir, outputFilename);
      fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
      console.log(`✓ Saved to ${outputPath}`);
    } else {
        console.log(`Skipping ${filename} - 'data' array not found.`);
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

