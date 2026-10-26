import { randomUUID } from "crypto";
import fs from "fs/promises";
import { isIP } from "net";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "data", "warehouse.json");

interface WarehouseData {
  ip: string;
  lastUpdate: string;
}

// Ensure the data directory exists
async function ensureDirectory(file: string) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
}

/** The first X-Forwarded-For hop when it is a literal IPv4/IPv6 address. */
export function heartbeatIP(forwardedFor: string | null): string | null {
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "";
  return isIP(ip) ? ip : null;
}

export async function saveWarehouseIP(ip: string, file = STORAGE_FILE): Promise<void> {
  await ensureDirectory(file);
  const data: WarehouseData = {
    ip,
    lastUpdate: new Date().toISOString(),
  };
  // Write a sibling temp file, then rename over the old one, so readers never
  // see a partly written file.
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(data, null, 2));
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

export async function getWarehouseIP(file = STORAGE_FILE): Promise<WarehouseData | null> {
  try {
    await ensureDirectory(file);
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
