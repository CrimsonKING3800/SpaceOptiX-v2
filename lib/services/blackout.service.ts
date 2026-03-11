import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface Blackout {
  _id: string;
  venue_id: string;
  startAt: string;
  endAt: string;
  reason: string;
  created_at: string;
}

export async function addBlackout(
  venueId: string,
  startAt: string,
  endAt: string,
  reason: string,
): Promise<{ success: boolean; message: string; blackoutId?: string }> {
  const db = await getDb();

  let venueObjectId: ObjectId;
  try {
    venueObjectId = new ObjectId(venueId);
  } catch {
    return { success: false, message: "Invalid venue ID" };
  }

  const venue = await db.collection("venues").findOne({ _id: venueObjectId });
  if (!venue) {
    return { success: false, message: "Venue not found" };
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { success: false, message: "Invalid date format" };
  }

  if (startDate >= endDate) {
    return { success: false, message: "Start time must be before end time" };
  }

  const result = await db.collection("blackouts").insertOne({
    venue_id: venueId,
    startAt,
    endAt,
    reason,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    message: "Blackout period created successfully",
    blackoutId: result.insertedId.toString(),
  };
}

export async function removeBlackout(
  blackoutId: string,
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(blackoutId);
  } catch {
    return { success: false, message: "Invalid blackout ID" };
  }

  const result = await db.collection("blackouts").deleteOne({ _id: objectId });

  if (result.deletedCount === 0) {
    return { success: false, message: "Blackout not found" };
  }

  return { success: true, message: "Blackout removed successfully" };
}

export async function checkBlackoutConflict(
  venueId: string,
  startAt: string,
  endAt: string,
): Promise<boolean> {
  const db = await getDb();

  const blackout = await db.collection("blackouts").findOne({
    venue_id: venueId,
    $and: [{ startAt: { $lt: endAt } }, { endAt: { $gt: startAt } }],
  });

  return !!blackout;
}
