import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { VenueType } from "@/lib/models";
import * as venueService from "@/lib/services/venue.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const filters: venueService.VenueFilters = {};
    const type = searchParams.get("type");
    const capacityMin = searchParams.get("capacity_min");

    if (type) {
      filters.type = type as VenueType;
    }
    if (capacityMin) {
      filters.capacity_min = parseInt(capacityMin, 10);
    }

    const venues = await venueService.getVenues(filters);
    return NextResponse.json({ venues });
  } catch (error) {
    console.error("Venue search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
