import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { Booking, BookingStatus } from "@/lib/models";
import * as conflictService from "./conflict.service";
import * as auditService from "./audit.service";

export interface BookingFilters {
  status?: string;
  limit?: number;
  requesterIdAlt?: string; // For legacy user_id field
}

export interface CreateBookingInput {
  venue_id: string;
  title: string;
  description?: string;
  // New schema fields (preferred)
  startAt?: string;
  endAt?: string;
  // Legacy schema fields (fallback for compatibility)
  date?: string;
  start_time?: string;
  end_time?: string;
  attendees_count?: number;
  purpose: string;
}

export interface UpdateBookingInput {
  status?: BookingStatus;
  rejection_reason?: string;
}

export interface SubmitBookingResult {
  success: boolean;
  message: string;
}

/**
 * Get bookings for a user with optional filtering.
 * Supports both legacy (user_id) and new (requester_id) field names.
 */
export async function getBookings(
  userId: string,
  filters: BookingFilters = {},
): Promise<Booking[]> {
  const db = await getDb();
  const { status, limit = 50 } = filters;

  const query: Record<string, unknown> = {
    $or: [{ user_id: userId }, { requester_id: userId }],
  };

  if (status && status !== "all") {
    query.status = status;
  }

  const bookings = await db
    .collection("bookings")
    .find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  return bookings as unknown as Booking[];
}

/**
 * Get a single booking by ID with enhanced details (venue, user populated).
 */
export async function getBookingById(
  bookingId: string,
): Promise<(Booking & { venue?: any; user?: any }) | null> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(bookingId);
  } catch {
    return null;
  }

  const booking = await db.collection("bookings").findOne({ _id: objectId });

  if (!booking) {
    return null;
  }

  // Populate venue
  let venue: any = undefined;
  const bookingRec = booking as Record<string, unknown>;
  if (bookingRec.venue_id) {
    try {
      const venueId = new ObjectId(bookingRec.venue_id as string);
      const venueDoc = await db.collection("venues").findOne({ _id: venueId });
      venue = venueDoc;
    } catch {
      // If ObjectId conversion fails, try string match with as any to bypass type strictness
      const venueDoc = await db
        .collection("venues")
        .findOne({ _id: bookingRec.venue_id } as any);
      venue = venueDoc;
    }
  }

  // Populate user (prefer requester_id, fall back to user_id)
  let user: any = undefined;
  const userId = (bookingRec.requester_id || bookingRec.user_id) as string;
  if (userId) {
    try {
      const uid = new ObjectId(userId);
      const userDoc = await db
        .collection("users")
        .findOne({ _id: uid }, { projection: { password: 0 } });
      user = userDoc;
    } catch {
      // If ObjectId conversion fails, try string match with as any
      const userDoc = await db
        .collection("users")
        .findOne({ _id: userId } as any, { projection: { password: 0 } });
      user = userDoc;
    }
  }

  return {
    ...booking,
    venue,
    user,
  } as any;
}

/**
 * Create a new booking with conflict detection.
 * Uses new schema by default (startAt, endAt, requester_id).
 * Falls back to legacy fields if provided.
 */
export async function createBooking(
  userId: string,
  userRole: string,
  input: CreateBookingInput,
): Promise<string> {
  const db = await getDb();

  if (!input.venue_id || !input.title || !input.purpose) {
    throw new Error("Missing required fields: venue_id, title, purpose");
  }

  // Determine booking time window (prefer new schema)
  let startAt: string;
  let endAt: string;
  let legacyDate: string | undefined;
  let legacyStartTime: string | undefined;
  let legacyEndTime: string | undefined;

  if (input.startAt && input.endAt) {
    // New schema: use startAt/endAt directly
    startAt = input.startAt;
    endAt = input.endAt;
  } else if (input.date && input.start_time && input.end_time) {
    // Legacy schema: convert to ISO8601 timestamps
    // Expected format: date="2024-03-15", start_time="09:00", end_time="10:30"
    const dateStr = input.date;
    const startTimeStr = input.start_time;
    const endTimeStr = input.end_time;

    // Combine to create ISO strings
    startAt = `${dateStr}T${startTimeStr}:00.000Z`;
    endAt = `${dateStr}T${endTimeStr}:00.000Z`;

    // Also store legacy fields for backward compatibility
    legacyDate = dateStr;
    legacyStartTime = startTimeStr;
    legacyEndTime = endTimeStr;
  } else {
    throw new Error(
      "Must provide either (startAt, endAt) or (date, start_time, end_time)",
    );
  }

  // Check for time slot conflicts
  const hasConflict = await conflictService.checkConflict(
    input.venue_id,
    startAt,
    endAt,
  );

  if (hasConflict) {
    throw new Error(
      "Time slot conflict. This venue is already booked for the selected time.",
    );
  }

  // Determine initial status based on role
  // Students: pending_professor (new schema) or draft (legacy)
  // Professor/Admin: approved (auto-approved now becomes approved)
  const autoApprove = userRole === "professor" || userRole === "admin";
  const initialStatus: BookingStatus = autoApprove
    ? "approved"
    : "pending_professor";

  const now = new Date().toISOString();

  const bookingDoc = {
    requester_id: userId,
    user_id: userId, // Keep legacy field for backward compat
    venue_id: input.venue_id,
    title: input.title,
    description: input.description || null,
    startAt,
    endAt,
    ...(legacyDate && {
      date: legacyDate,
      start_time: legacyStartTime,
      end_time: legacyEndTime,
    }),
    status: initialStatus,
    attendees_count: input.attendees_count || 1,
    purpose: input.purpose,
    rejection_reason: null,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection("bookings").insertOne(bookingDoc);

  // Log audit entry
  await auditService.logAction({
    userId: userId,
    action: "booking_created",
    entityType: "booking",
    entityId: result.insertedId.toString(),
    details: {
      title: input.title,
      venue_id: input.venue_id,
      status: initialStatus,
    },
    timestamp: now,
  });

  return result.insertedId.toString();
}

/**
 * Update a booking's status and/or rejection reason.
 * Validates ownership before allowing update.
 */
export async function updateBooking(
  bookingId: string,
  userId: string,
  userRole: string,
  updates: UpdateBookingInput,
): Promise<void> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(bookingId);
  } catch {
    throw new Error("Invalid booking ID");
  }

  const booking = await db.collection("bookings").findOne({ _id: objectId });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Only owner or admin can modify
  const isOwner =
    (booking.requester_id && booking.requester_id === userId) ||
    (booking.user_id && booking.user_id === userId);

  if (!isOwner && userRole !== "admin") {
    throw new Error("Unauthorized: only owner or admin can modify");
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { updated_at: now };

  if (updates.status) updateData.status = updates.status;
  if (updates.rejection_reason)
    updateData.rejection_reason = updates.rejection_reason;

  if (Object.keys(updateData).length === 1) {
    // Only updated_at, no actual changes
    return;
  }

  await db
    .collection("bookings")
    .updateOne({ _id: objectId }, { $set: updateData });

  // Log audit entry
  await auditService.logAction({
    userId: userId,
    action: "booking_submitted",
    entityType: "booking",
    entityId: bookingId,
    details: updateData,
    timestamp: now,
  });
}

/**
 * Submit a draft booking for professor approval.
 */
export async function submitBooking(
  bookingId: string,
  userId?: string,
  userRole?: string,
): Promise<SubmitBookingResult> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(bookingId);
  } catch {
    return { success: false, message: "Invalid booking ID" };
  }

  const booking = await db.collection("bookings").findOne({ _id: objectId });
  if (!booking) {
    return { success: false, message: "Booking not found" };
  }

  if (userId) {
    const isOwner =
      ((booking as Record<string, unknown>).requester_id &&
        (booking as Record<string, unknown>).requester_id === userId) ||
      ((booking as Record<string, unknown>).user_id &&
        (booking as Record<string, unknown>).user_id === userId);
    if (!isOwner && userRole !== "admin") {
      return {
        success: false,
        message: "Unauthorized: only owner or admin can submit",
      };
    }
  }

  const currentStatus = (booking as Record<string, unknown>).status as string;
  if (currentStatus !== "draft") {
    return { success: false, message: "Only draft bookings can be submitted" };
  }

  const bookingRec = booking as Record<string, unknown>;
  const venueId = bookingRec.venue_id as string;
  const startAt = bookingRec.startAt as string;
  const endAt = bookingRec.endAt as string;

  const hasConflict = await conflictService.checkConflict(
    venueId,
    startAt,
    endAt,
    bookingId,
  );
  if (hasConflict) {
    return {
      success: false,
      message: "Scheduling conflict detected. Please choose another time.",
    };
  }

  const now = new Date().toISOString();
  await db.collection("bookings").updateOne(
    { _id: objectId },
    {
      $set: {
        status: "pending_professor",
        updated_at: now,
      },
    },
  );

  if (userId) {
    await auditService.logAction({
      userId,
      action: "booking_submitted",
      entityType: "booking",
      entityId: bookingId,
      details: {
        from_status: "draft",
        to_status: "pending_professor",
      },
      timestamp: now,
    });
  }

  return {
    success: true,
    message: "Booking submitted for professor approval",
  };
}

/**
 * Cancel a booking if still cancellable.
 */
export async function cancelBooking(
  bookingId: string,
  userId?: string,
  userRole?: string,
): Promise<Booking> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(bookingId);
  } catch {
    throw new Error("Invalid booking ID");
  }

  const booking = await db.collection("bookings").findOne({ _id: objectId });
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (userId) {
    const isOwner =
      ((booking as Record<string, unknown>).requester_id &&
        (booking as Record<string, unknown>).requester_id === userId) ||
      ((booking as Record<string, unknown>).user_id &&
        (booking as Record<string, unknown>).user_id === userId);
    if (!isOwner && userRole !== "admin") {
      throw new Error("Unauthorized: only owner or admin can cancel");
    }
  }

  const currentStatus = (booking as Record<string, unknown>)
    .status as BookingStatus;
  const cancellableStatuses: BookingStatus[] = [
    "draft",
    "pending_professor",
    "pending_admin",
  ];

  if (!cancellableStatuses.includes(currentStatus)) {
    throw new Error(`Cannot cancel a booking with status '${currentStatus}'`);
  }

  const now = new Date().toISOString();
  await db
    .collection("bookings")
    .updateOne(
      { _id: objectId },
      { $set: { status: "cancelled", updated_at: now } },
    );

  if (userId) {
    await auditService.logAction({
      userId,
      action: "booking_cancelled",
      entityType: "booking",
      entityId: bookingId,
      details: {
        from_status: currentStatus,
        to_status: "cancelled",
      },
      timestamp: now,
    });
  }

  const updated = await db.collection("bookings").findOne({ _id: objectId });
  return { ...updated, _id: bookingId } as unknown as Booking;
}
