import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as venueController from "@/lib/controllers/venue.controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: venueId } = await params;
    const body = await request.json();
    return await venueController.addBlackout(venueId, body);
  } catch (error) {
    console.error("Add blackout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  _context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const blackoutId = url.searchParams.get("blackoutId");
    if (!blackoutId) {
      return NextResponse.json(
        { error: "Missing blackoutId query param" },
        { status: 400 },
      );
    }

    return await venueController.removeBlackout(blackoutId);
  } catch (error) {
    console.error("Remove blackout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
