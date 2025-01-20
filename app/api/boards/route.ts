import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { Board } from "@/typings/types";
import { ItemStatus } from "@/typings/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "true";
    const includeHidden = searchParams.get("includeHidden") === "true";

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(`${process.env.NEXT_PUBLIC_MODE}`);

    // Create a pipeline to filter items
    const pipeline = [
      { $limit: 1 }, // Get the first document
      {
        $project: {
          id: 1,
          name: 1,
          settings: 1,
          weeklySchedules: 1,
          items_page: {
            $mergeObjects: [
              "$items_page",
              {
                items: {
                  $filter: {
                    input: "$items_page.items",
                    as: "item",
                    cond: {
                      $cond: {
                        if: { $eq: [includeDone, true] },
                        then: { $eq: ["$$item.status", ItemStatus.Done] },
                        else: {
                          $cond: {
                            if: { $eq: [includeHidden, true] },
                            then: {
                              $and: [
                                { $eq: ["$$item.visible", false] },
                                { $ne: ["$$item.status", ItemStatus.Done] },
                              ],
                            },
                            else: {
                              $and: [
                                { $ne: ["$$item.status", ItemStatus.Done] },
                                { $eq: ["$$item.visible", true] },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    ];

    const board = await collection.aggregate(pipeline).next();

    return NextResponse.json(board || null);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    console.debug("PATCH request received");

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(`${process.env.NEXT_PUBLIC_MODE}`);

    const { id, updates, arrayFilters, updateType } = await request.json();

    // Handle different types of updates
    if (updateType === "item") {
      // Update a specific item using arrayFilters
      const result = await collection.updateOne(
        { id },
        { $set: updates },
        { arrayFilters }
      );
      return NextResponse.json(result);
    } else {
      // Handle bulk updates (like reordering) using the existing approach
      const result = await collection.updateOne(
        { id },
        { $set: updates },
        arrayFilters ? { arrayFilters } : undefined
      );
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}
