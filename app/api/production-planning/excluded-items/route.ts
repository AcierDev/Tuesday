import { NextResponse } from "next/server";
import clientPromise from "../../db/connect";

// Single document holding the set of item IDs the production-planning
// auto-plan should skip ("pinned to the sidebar"). Stored as a plain array on
// one global doc — small, easy to serialize, no per-item churn.

const COLLECTION_NAME = "production-planning-meta";
const DOC_ID = "excluded-from-auto-plan";

type Doc = {
  _id: string;
  itemIds: string[];
};

async function getCollection() {
  const client = await clientPromise;
  return client
    .db("react-web-app")
    .collection<Doc>(`${COLLECTION_NAME}-${process.env.NEXT_PUBLIC_MODE}`);
}

export async function GET() {
  try {
    const collection = await getCollection();
    const doc = await collection.findOne({ _id: DOC_ID });
    return NextResponse.json({ itemIds: doc?.itemIds ?? [] });
  } catch (error) {
    console.error("GET /api/production-planning/excluded-items failed:", error);
    return NextResponse.json(
      { error: "Failed to load excluded items" },
      { status: 500 }
    );
  }
}

// Body: { itemId: string, excluded: boolean }
// Adds or removes the item from the exclusion list.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const itemId = typeof body?.itemId === "string" ? body.itemId : "";
    const excluded = !!body?.excluded;
    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }

    const collection = await getCollection();
    const update = excluded
      ? { $addToSet: { itemIds: itemId } }
      : { $pull: { itemIds: itemId } };

    await collection.updateOne({ _id: DOC_ID }, update, { upsert: true });
    const doc = await collection.findOne({ _id: DOC_ID });
    return NextResponse.json({ itemIds: doc?.itemIds ?? [] });
  } catch (error) {
    console.error("POST /api/production-planning/excluded-items failed:", error);
    return NextResponse.json(
      { error: "Failed to update excluded items" },
      { status: 500 }
    );
  }
}
