import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

// Initialize the S3 client with credentials from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
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

/**
 * List all PDF files in the S3 bucket
 */
export async function listAllLabels(): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
  });

  const response = await s3Client.send(command);

  if (!response.Contents) {
    return [];
  }

  return response.Contents.filter((obj) => obj.Key?.endsWith(".pdf")).map(
    (obj) => obj.Key as string
  );
}

/**
 * List PDF files for a specific order ID
 * Matches patterns: {orderId}.pdf, {orderId}-1.pdf, {orderId}-2.pdf, etc.
 */
export async function listLabelsForOrder(orderId: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: orderId,
  });

  const response = await s3Client.send(command);

  if (!response.Contents) {
    return [];
  }

  // Filter to only include exact matches for this order ID
  // (orderId.pdf or orderId-N.pdf)
  const regex = new RegExp(`^${orderId}(?:-\\d+)?\\.pdf$`);

  return response.Contents.filter((obj) => obj.Key && regex.test(obj.Key)).map(
    (obj) => obj.Key as string
  );
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
