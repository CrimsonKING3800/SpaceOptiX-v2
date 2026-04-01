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

export interface VenueAvailabilityResult {
  venue: {
    _id: string;
    name: string;
    availability_hours: { start: string; end: string };
  };
  bookings: {
    startAt: string;
    endAt: string;
    title: string;
    status: string;
  }[];
}

/**
 * Get all bookings for a venue within a date range.
 * Used by the calendar slot picker to show occupied/free time blocks.
 */
export async function getVenueAvailability(
  venueId: string,
  startDate: string,
  endDate: string,
): Promise<VenueAvailabilityResult | null> {
  const db = await getDb();

  // Validate and fetch venue
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(venueId);
  } catch {
    return null;
  }

  const venue = (await db
    .collection("venues")
    .findOne({ _id: objectId })) as any;
  if (!venue) {
    return null;
  }

  // Build ISO range from date strings (YYYY-MM-DD)
  const rangeStart = `${startDate}T00:00:00.000Z`;
  const rangeEnd = `${endDate}T23:59:59.999Z`;

  // Fetch bookings that overlap with the date range (exclude cancelled/rejected)
  const bookings = await db
    .collection("bookings")
    .find({
      venue_id: venueId,
      status: { $nin: ["rejected", "cancelled"] },
      $and: [{ startAt: { $lt: rangeEnd } }, { endAt: { $gt: rangeStart } }],
    })
    .project({ startAt: 1, endAt: 1, title: 1, status: 1, _id: 0 })
    .toArray();

  return {
    venue: {
      _id: venue._id.toString(),
      name: venue.name,
      availability_hours: venue.availability_hours || {
        start: "08:00",
        end: "22:00",
      },
    },
    bookings: bookings as VenueAvailabilityResult["bookings"],
  };
}

