import fs from "fs/promises";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "data", "warehouse.json");

interface WarehouseData {
  ip: string;
  lastUpdate: string;
}

// Ensure the data directory exists
async function ensureDirectory() {
  const dir = path.dirname(STORAGE_FILE);
  await fs.mkdir(dir, { recursive: true });
}

export async function saveWarehouseIP(ip: string): Promise<void> {
  await ensureDirectory();
  const data: WarehouseData = {
    ip,
    lastUpdate: new Date().toISOString(),
  };
  await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
}

export async function getWarehouseIP(): Promise<WarehouseData | null> {
  try {
    await ensureDirectory();
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
