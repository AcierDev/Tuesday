import { NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { BUCKET_NAME, s3Client } from "@/lib/s3-client";

const PREFIX = "quick-labels/";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (key) {
    if (!key.startsWith(PREFIX)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    try {
      const res = await s3Client.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
      );
      if (!res.Body) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const bytes = await res.Body.transformToByteArray();
      return new Response(bytes, {
        headers: {
          "Content-Type": res.ContentType ?? "application/octet-stream",
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (err) {
      console.error("Failed to fetch quick label", err);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const res = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: PREFIX })
    );
    const items = (res.Contents ?? [])
      .filter((o) => o.Key && o.Key !== PREFIX)
      .map((o) => ({
        key: o.Key!,
        filename: extractFilename(o.Key!),
        size: o.Size ?? 0,
        uploadedAt: o.LastModified?.toISOString() ?? null,
      }))
      .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Failed to list quick labels", err);
    return NextResponse.json(
      { error: "Failed to list" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const safeName = sanitizeName(file.name) || "label";
    const key = `${PREFIX}${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return NextResponse.json({
      key,
      filename: file.name,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to upload quick label", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key || !key.startsWith(PREFIX)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete quick label", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

function extractFilename(key: string): string {
  const base = key.slice(PREFIX.length);
  const dashIdx = base.indexOf("-");
  return dashIdx >= 0 ? base.slice(dashIdx + 1) : base;
}
