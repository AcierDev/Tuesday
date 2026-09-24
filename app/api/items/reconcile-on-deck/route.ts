import { NextResponse } from "next/server";

import { logActivity } from "@/app/api/activities/log";
import { getDb } from "@/app/api/db/connect";
import {
  reconcileOnDeck,
  type OnDeckReconciliationRepository,
} from "@/lib/on-deck-reconciliation";
import { ItemStatus, type Item } from "@/typings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST() {
  try {
    const db = await getDb();
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );
    const repository: OnDeckReconciliationRepository = {
      listCandidates: () =>
        collection
          .find({
            visible: true,
            deleted: false,
            status: { $in: [ItemStatus.New, ItemStatus.OnDeck] },
          })
          .toArray(),
      applyTransition: async (transition) => {
        const previous = await collection.findOneAndUpdate(
          {
            id: transition.id,
            status: transition.fromStatus,
            prevStatus: transition.fromPrevStatus,
            visible: true,
            deleted: false,
            onHold: { $ne: true },
          },
          {
            $set: {
              status: transition.toStatus,
              prevStatus: transition.toPrevStatus,
            },
          },
          { returnDocument: "before" }
        );

        if (!previous) return false;

        await logActivity(db, {
          itemId: transition.id,
          type: "status_change",
          changes: [
            {
              field: "status",
              oldValue: transition.fromStatus,
              newValue: transition.toStatus,
            },
          ],
          metadata: {
            customerName: previous.customerName,
            design: previous.design,
            size: previous.size,
          },
        });
        return true;
      },
    };

    const result = await reconcileOnDeck(repository);
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to reconcile On Deck orders:", error);
    return NextResponse.json(
      { error: "Failed to reconcile On Deck orders" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
