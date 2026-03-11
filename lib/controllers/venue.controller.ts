import { NextRequest, NextResponse } from "next/server";
import { VenueType } from "@/lib/models";
import * as venueService from "@/lib/services/venue.service";
import * as blackoutService from "@/lib/services/blackout.service";

export async function getVenues(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const filters: venueService.VenueFilters = {};
  const type = searchParams.get("type");
  const building = searchParams.get("building");
  const capacityMin = searchParams.get("capacity_min");

  if (type) {
    filters.type = type as VenueType;
  }
  if (building) {
    filters.building = building;
  }
  if (capacityMin) {
    filters.capacity_min = parseInt(capacityMin, 10);
  }

  const venues = await venueService.getVenues(filters);
  return NextResponse.json({ venues });
}

export async function getVenueById(id: string) {
  const venue = await venueService.getVenueById(id);

  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  return NextResponse.json({ venue });
}

export async function updateVenue(id: string, body: any) {
  const result = await venueService.updateVenue(id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  const updatedVenue = await venueService.getVenueById(id);
  return NextResponse.json({ venue: updatedVenue });
}

export async function addBlackout(
  venueId: string,
  body: { startAt: string; endAt: string; reason: string },
) {
  const { startAt, endAt, reason } = body;

  if (!startAt || !endAt || !reason) {
    return NextResponse.json(
      { error: "Missing required fields: startAt, endAt, reason" },
      { status: 400 },
    );
  }

  const result = await blackoutService.addBlackout(
    venueId,
    startAt,
    endAt,
    reason,
  );
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(
    { success: true, blackoutId: result.blackoutId },
    { status: 201 },
  );
}

export async function removeBlackout(blackoutId: string) {
  const result = await blackoutService.removeBlackout(blackoutId);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: result.message });
}
