import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as venueService from "@/lib/services/venue.service";

/**
 * GET /api/venues/[id]/slots?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns all bookings for a venue within a date range,
 * plus the venue's operating hours. Used by the calendar slot picker UI.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Missing required query params: start, end (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const result = await venueService.getVenueAvailability(id, start, end);

    if (!result) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Venue slots error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
