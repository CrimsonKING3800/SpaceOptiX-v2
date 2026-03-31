import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import * as approvalService from "@/lib/services/approval.service";

export interface ListApprovalsParams {
  user: { userId: string; role: string };
  query: { status?: string; limit?: string };
}

export interface DecideApprovalParams {
  user: { userId: string; role: string };
  bookingId: string;
  body: Record<string, unknown>;
}

/**
 * Handle GET request: list pending approvals for the current user (professor/admin).
 */
export async function listApprovals({
  user,
  query,
}: ListApprovalsParams): Promise<NextResponse> {
  try {
    const bookings = await approvalService.getApprovalsQueue(
      user.userId,
      user.role,
      {
        status: query.status as any,
        limit: Math.min(parseInt(query.limit || "50"), 500),
      },
    );

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

    return NextResponse.json({ bookings: enrichedBookings });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("List approvals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle POST request: approve or reject a booking.
 */
export async function decideApproval({
  user,
  bookingId,
  body,
}: DecideApprovalParams): Promise<NextResponse> {
  try {
    const status = body.status as string;
    const comments = body.comments as string | undefined;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'" },
        { status: 400 },
      );
    }

    await approvalService.decideApproval(bookingId, user.userId, user.role, {
      status: status as any,
      comments,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("Invalid booking ID")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Booking not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.message.includes("can only approve") ||
        error.message.includes("already")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Approval decision error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle GET request: approval history for a booking.
 */
export async function getApprovals(bookingId: string): Promise<NextResponse> {
  try {
    const approvals = await approvalService.getApprovals(bookingId);
    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("Get approvals history error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle POST request from /api/bookings/[id]/approve: approve or reject using stage+action body.
 */
export async function approveBooking(
  bookingId: string,
  userId: string,
  userRole: string,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const action = body.action as string;
  const comments = body.comments as string | undefined;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  return await decideApproval({
    user: { userId, role: userRole },
    bookingId,
    body: {
      status: action === "approve" ? "approved" : "rejected",
      comments,
    },
  });
}
