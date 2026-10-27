import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { filterLegacyLabelKeys } from "@/lib/shipping-labels/storage";
import {
  legacyLabelKeyPattern,
  uniqueLegacyLabelFilename,
} from "@/lib/shipping-labels/legacy-filename";

// The SDK waits forever by default, so one stalled connection left a label
// dialog spinning until the browser gave up. These bound each attempt; the
// SDK's built-in retries then pick a fresh connection.
const S3_CONNECTION_TIMEOUT_MS = 4_000;
const S3_SOCKET_IDLE_TIMEOUT_MS = 15_000;
const S3_MAX_ATTEMPTS = 3;

// Initialize the S3 client with credentials from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  maxAttempts: S3_MAX_ATTEMPTS,
  requestHandler: {
    connectionTimeout: S3_CONNECTION_TIMEOUT_MS,
    requestTimeout: S3_SOCKET_IDLE_TIMEOUT_MS,
  },
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

/**
 * Get the public URL for an S3 object
 */
export function getPublicUrl(filename: string): string {
  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${filename}`;
}

// S3 returns at most this many keys per request.
const KEYS_PER_LIST_REQUEST = 1000;

/** Every key under `options`, following continuation tokens past the first 1000. */
async function listKeys(options: { Prefix?: string; Delimiter?: string }): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: KEYS_PER_LIST_REQUEST,
        ContinuationToken: continuationToken,
        ...options,
      })
    );
    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

/**
 * List all legacy PDF files (bucket root only). The delimiter keeps S3 from
 * walking the shipping-label-pages/ and shipping-label-uploads/ trees, which
 * grow with every new label.
 */
export async function listAllLabels(): Promise<string[]> {
  return filterLegacyLabelKeys(await listKeys({ Delimiter: "/" }));
}

/**
 * List PDF files for a specific order ID
 * Matches patterns: {orderId}.pdf, {orderId}-1.pdf, {orderId}-2.pdf, etc.
 */
export async function listLabelsForOrder(orderId: string): Promise<string[]> {
  const keys = await listKeys({ Prefix: orderId, Delimiter: "/" });

  // Filter to only include exact matches for this order ID
  // (orderId.pdf or orderId-N.pdf); the id is escaped before building the regex.
  const regex = legacyLabelKeyPattern(orderId);

  return keys.filter((key) => regex.test(key));
}

/**
 * Filename for a newly purchased label. Unique per call, so two purchases for
 * the same order can never pick (and overwrite) the same key.
 */
export async function getNextLabelFilename(orderId: string): Promise<string> {
  return uniqueLegacyLabelFilename(orderId);
}

/**
 * Upload a PDF file to S3
 */
export async function uploadLabel(
  filename: string,
  fileBuffer: Buffer,
  contentType: string = "application/pdf"
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return getPublicUrl(filename);
}

/**
 * Download a PDF file from S3 as a Buffer
 */
export async function getLabel(filename: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`Label ${filename} not found`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Delete a PDF file from S3
 */
export async function deleteLabel(filename: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });

  await s3Client.send(command);
}

/**
 * Check if a file exists in S3
 */
export async function labelExists(filename: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

export { s3Client, BUCKET_NAME };
