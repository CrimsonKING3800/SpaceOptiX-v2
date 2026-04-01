import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkConflict } from "@/lib/services/conflict.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: venueId } = await params;
    const { searchParams } = request.nextUrl;
    const startAt = searchParams.get("startAt");
    const endAt = searchParams.get("endAt");

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required query params: startAt, endAt" },
        { status: 400 },
      );
    }

    const hasBookingConflict = await checkConflict(venueId, startAt, endAt);

    return NextResponse.json({
      available: !hasBookingConflict,
      booking_conflict: hasBookingConflict,
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
