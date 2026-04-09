import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import * as bookingService from "@/lib/services/booking.service";

export interface BookingListQuery {
  status?: string;
  limit?: string;
  all?: string;
}

export interface ListBookingsParams {
  user: { userId: string; role: string };
  query: BookingListQuery;
}

export interface CreateBookingParams {
  user: { userId: string; role: string };
  body: Record<string, unknown>;
}

export interface UpdateBookingParams {
  user: { userId: string; role: string };
  bookingId: string;
  body: Record<string, unknown>;
}

/**
 * Handle GET request: list bookings with venue and user populated.
 */
export async function listBookings({
  user,
  query,
}: ListBookingsParams): Promise<NextResponse> {
  try {
    const limit = Math.min(
      parseInt(query.limit || "50"),
      500, // Cap at 500
    );
    const status = query.status;
    const showAll = query.all === "true" && user.role === "admin";

    let bookings;
    if (showAll) {
      // Admin requesting all bookings
      const db = await getDb();
      const dbQuery: Record<string, unknown> = {};
      if (status && status !== "all") {
        dbQuery.status = status;
      }
      bookings = await db
        .collection("bookings")
        .find(dbQuery)
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
    } else {
      // User or admin requesting own bookings
      bookings = await bookingService.getBookings(user.userId, {
        status: status && status !== "all" ? status : undefined,
        limit,
      });
    }

    // Populate venue and user details
    const venueIds = [
      ...new Set(
        bookings
          .map((b) => (b as Record<string, unknown>).venue_id)
          .filter(Boolean),
      ),
    ] as string[];
    const venues =
      venueIds.length > 0
        ? await (async () => {
            const db = await getDb();
            const venueObjectIds: (ObjectId | string)[] = venueIds.map((id) => {
              try {
                return new ObjectId(id);
              } catch {
                return id;
              }
            });
            return db
              .collection("venues")
              .find({
                _id: {
                  $in: venueObjectIds as any,
                },
              })
              .toArray();
          })()
        : [];

    const venueMap = new Map(venues.map((v) => [v._id.toString(), v]));

    const userIds = [
      ...new Set(
        bookings
          .map((b) => {
            const rec = b as Record<string, unknown>;
            return (rec.requester_id || rec.user_id) as string;
          })
          .filter(Boolean),
      ),
    ] as string[];
    const users =
      userIds.length > 0
        ? await (async () => {
            const db = await getDb();
            const userObjectIds: (ObjectId | string)[] = userIds.map((id) => {
              try {
                return new ObjectId(id);
              } catch {
                return id;
              }
            });
            return db
              .collection("users")
              .find(
                {
                  _id: {
                    $in: userObjectIds as any,
                  },
                },
                { projection: { password: 0 } },
              )
              .toArray();
          })()
        : [];

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enrichedBookings = bookings.map((b) => {
      const rec = b as Record<string, unknown>;
      const userId = (rec.requester_id || rec.user_id) as string;
      return {
        ...rec,
        _id: rec._id?.toString?.() || rec._id,
        venue: venueMap.get(rec.venue_id as string) || null,
        requester: userMap.get(userId) || null,
      };
    });

    // Fetch approvals for all bookings
    const bookingIds = enrichedBookings
      .map((b) => b._id as string)
      .filter(Boolean);

    const db2 = await getDb();
    const allApprovals =
      bookingIds.length > 0
        ? await db2
            .collection("approvals")
            .find({ booking_id: { $in: bookingIds } })
            .sort({ created_at: 1 })
            .toArray()
        : [];

    // Also fetch approver user details
    const approverIds = [
      ...new Set(allApprovals.map((a) => a.approver_id as string).filter(Boolean)),
    ];
    const approverUsers =
      approverIds.length > 0
        ? await db2
            .collection("users")
            .find(
              {
                _id: {
                  $in: approverIds.map((id) => {
                    try {
                      return new ObjectId(id);
                    } catch {
                      return id;
                    }
                  }) as any,
                },
              },
              { projection: { password: 0 } },
            )
            .toArray()
        : [];
    const approverMap = new Map(approverUsers.map((u) => [u._id.toString(), u]));

    const approvalsByBooking = new Map<string, any[]>();
    for (const a of allApprovals) {
      const bid = a.booking_id as string;
      if (!approvalsByBooking.has(bid)) approvalsByBooking.set(bid, []);
      approvalsByBooking.get(bid)!.push({
        _id: a._id.toString(),
        stage: a.stage,
        status: a.status,
        comments: a.comments || null,
        decided_at: a.decided_at || null,
        approver: approverMap.get(a.approver_id as string) || null,
      });
    }

    const finalBookings = enrichedBookings.map((b) => ({
      ...b,
      approvals: approvalsByBooking.get(b._id as string) || [],
    }));

    return NextResponse.json({ bookings: finalBookings });
  } catch (error) {
    console.error("List bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle POST request: create a new booking.
 */
export async function createBooking({
  user,
  body,
}: CreateBookingParams): Promise<NextResponse> {
  try {
    const bookingId = await bookingService.createBooking(
      user.userId,
      user.role,
      {
        venue_id: body.venue_id as string,
        title: body.title as string,
        description: body.description as string | undefined,
        startAt: body.startAt as string | undefined,
        endAt: body.endAt as string | undefined,
        date: body.date as string | undefined,
        start_time: body.start_time as string | undefined,
        end_time: body.end_time as string | undefined,
        attendees_count: body.attendees_count as number | undefined,
        purpose: body.purpose as string,
      },
    );

    return NextResponse.json({ id: bookingId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Missing required fields")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Time slot conflict")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle PATCH request: update a booking's status or rejection reason.
 */
export async function updateBooking({
  user,
  bookingId,
  body,
}: UpdateBookingParams): Promise<NextResponse> {
  try {
    await bookingService.updateBooking(bookingId, user.userId, user.role, {
      status: body.status as any,
      rejection_reason: body.rejection_reason as string | undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Invalid booking ID")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Booking not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Update booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
