import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { Venue, VenueType } from "@/lib/models";

export interface VenueFilters {
  type?: VenueType;
  building?: string;
  capacity_min?: number;
}

export async function getVenues(filters?: VenueFilters): Promise<Venue[]> {
  const db = await getDb();

  const query: Record<string, unknown> = { is_active: true };

  if (filters?.type) {
    query.type = filters.type;
  }
  if (filters?.building) {
    query.building = filters.building;
  }
  if (filters?.capacity_min) {
    query.capacity = { $gte: filters.capacity_min };
  }

  const venues = await db
    .collection("venues")
    .find(query)
    .sort({ name: 1 })
    .toArray();

  return venues.map((venue: any) => ({
    ...venue,
    _id: venue._id.toString(),
  })) as Venue[];
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const venue = (await db
    .collection("venues")
    .findOne({ _id: objectId })) as any;
  if (!venue) {
    return null;
  }

  return {
    ...venue,
    _id: venue._id.toString(),
  } as Venue;
}

export async function updateVenue(
  id: string,
  updates: Partial<Venue>,
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return { success: false, message: "Invalid venue ID" };
  }

  const venue = await db.collection("venues").findOne({ _id: objectId });
  if (!venue) {
    return { success: false, message: "Venue not found" };
  }

  const { _id, created_at, ...safeUpdates } = updates as Partial<Venue> & {
    _id?: string;
    created_at?: string;
  };

  await db.collection("venues").updateOne(
    { _id: objectId },
    {
      $set: {
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      },
    },
  );

  return { success: true, message: "Venue updated successfully" };
}
