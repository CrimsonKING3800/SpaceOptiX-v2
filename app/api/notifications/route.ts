import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    // Get bookings created by this user
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(user.userId);
    } catch {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Find all bookings by this user to get their IDs
    const userBookings = await db
      .collection("bookings")
      .find({ requester_id: user.userId })
      .project({ _id: 1, title: 1 })
      .toArray();

    const bookingIds = userBookings.map((b) => b._id.toString());
    const bookingTitleMap = new Map(
      userBookings.map((b) => [b._id.toString(), b.title]),
    );

    // Booking-related audit actions we want to show as notifications
    const bookingActions = [
      "booking_created",
      "booking_submitted",
      "booking_approved",
      "booking_rejected",
      "booking_cancelled",
      "approval_professor_approved",
      "approval_professor_rejected",
      "approval_admin_approved",
      "approval_admin_rejected",
      "approval_professor_pending",
      "approval_admin_pending",
    ];

    // Query audit logs for:
    // 1. Actions performed BY this user on bookings
    // 2. Actions performed ON this user's bookings (by approvers)
    const query = {
      $or: [
        { user_id: user.userId, action: { $in: bookingActions } },
        {
          entity_type: "booking",
          entity_id: { $in: bookingIds },
          action: { $in: bookingActions },
        },
      ],
    };

    const notifications = await db
      .collection("audit_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    // Enrich with booking titles
    const enrichedNotifications = notifications.map((n) => ({
      _id: n._id.toString(),
      action: n.action,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      details: {
        ...n.details,
        title: n.details?.title || bookingTitleMap.get(n.entity_id) || "Booking",
      },
      timestamp: n.timestamp,
    }));

    return NextResponse.json({ notifications: enrichedNotifications });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
