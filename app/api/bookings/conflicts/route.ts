import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkConflict } from "@/lib/services/conflict.service";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const venueId = searchParams.get("venueId");
    const startAt = searchParams.get("startAt");
    const endAt = searchParams.get("endAt");

    if (!venueId || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required query params: venueId, startAt, endAt" },
        { status: 400 },
      );
    }

    const hasConflict = await checkConflict(venueId, startAt, endAt);

    if (!hasConflict) {
      return NextResponse.json({ conflict: false });
    }

    const db = await getDb();
    const conflicting = await db.collection("bookings").findOne({
      venue_id: venueId,
      status: { $nin: ["rejected", "cancelled", "draft"] },
      $and: [{ startAt: { $lt: endAt } }, { endAt: { $gt: startAt } }],
    });

    return NextResponse.json({
      conflict: true,
      booking: conflicting
        ? { ...conflicting, _id: conflicting._id.toString() }
        : null,
    });
  } catch (error) {
    console.error("Conflict check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
