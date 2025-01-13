"use server";

import clientPromise from "../api/db/connect";
import { InventoryItem } from "@/typings/types";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";

export async function getInventory() {
  const client = await clientPromise;
  const db = client.db("react-web-app");
  const collection = db.collection<InventoryItem>(
    `inventory-${process.env.NODE_ENV}`
  );

  return collection.find({}).toArray();
}

export async function addInventoryItem(item: Omit<InventoryItem, "_id">) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

  const result = await collection.insertOne(item);
  revalidatePath("/inventory");
  return result;
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Omit<InventoryItem, "_id">>
) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  revalidatePath("/inventory");
  return result;
}

export async function deleteInventoryItem(id: string) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/inventory");
  return result;
}
