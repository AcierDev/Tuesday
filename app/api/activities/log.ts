import { Db, ObjectId } from "mongodb";
import {
  Activity,
  ActivityChange,
  ActivityType,
  BaseActivity,
} from "@/typings/types";

export async function logActivity(
  db: Db,
  activityData: {
    itemId: string;
    type: ActivityType;
    changes: ActivityChange[];
    userName?: string;
    metadata?: Activity["metadata"];
  }
) {
  try {
    const activity: Omit<BaseActivity, "id"> & { _id: ObjectId; id: string } = {
      _id: new ObjectId(),
      id: crypto.randomUUID(),
      itemId: activityData.itemId,
      type: activityData.type,
      timestamp: Date.now(),
      userName: activityData.userName,
      changes: activityData.changes,
      metadata: activityData.metadata,
    };

    const collection = db.collection<Activity>(
      `activities-${process.env.NEXT_PUBLIC_MODE}`
    );
    await collection.insertOne(activity as any);
    return true;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return false;
  }
}
