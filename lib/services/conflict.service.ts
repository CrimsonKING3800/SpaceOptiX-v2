import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function checkConflict(
  venueId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string,
): Promise<boolean> {
  const db = await getDb();

  const query: Record<string, unknown> = {
    venue_id: venueId,
    status: { $nin: ["rejected", "cancelled", "draft"] },
    $and: [{ startAt: { $lt: endAt } }, { endAt: { $gt: startAt } }],
  };

  if (excludeBookingId) {
    try {
      query._id = { $ne: new ObjectId(excludeBookingId) };
    } catch {
      query._id = { $ne: excludeBookingId };
    }
  }

  const conflict = await db.collection("bookings").findOne(query);

  return !!conflict;
}
