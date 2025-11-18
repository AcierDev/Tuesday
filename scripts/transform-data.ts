import fs from 'fs';
import path from 'path';
import { Item } from '../typings/types';

// Helper to process item (logic similar to ItemUtil but for raw transformation)
function transformItem(item: any) {
  const newItem = { ...item };

  const getVal = (colName: string) => {
    return item.values?.find((v: any) => v.columnName === colName)?.text || "";
  };

  // Lift core fields
  newItem.design = getVal("Design");
  newItem.size = getVal("Size");
  newItem.customerName = getVal("Customer Name");
  newItem.dueDate = getVal("Due Date");

  // Create simplified search text
  newItem.searchText = (item.values || [])
    .map((v: any) => v.text || "")
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
    console.log(`Transforming ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    if (json.data && Array.isArray(json.data)) {
      json.data = json.data.map(transformItem);
      
      const outputFilename = `transformed-${filename}`;
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

