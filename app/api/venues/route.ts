import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import * as venueController from "@/lib/controllers/venue.controller";
import * as auditService from "@/lib/services/audit.service";

export async function GET(request: NextRequest) {
  try {
    return await venueController.getVenues(request);
  } catch (error) {
    console.error("Venues fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      type,
      building,
      floor,
      capacity,
      amenities,
      availability_hours,
      description,
    } = body;

    if (!name || !type || !building || floor === undefined || !capacity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection("venues").insertOne({
      name,
      type,
      building,
      floor: parseInt(floor),
      capacity: parseInt(capacity),
      amenities: amenities || [],
      availability_hours: availability_hours || {
        start: "08:00",
        end: "22:00",
      },
      description: description || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    await auditService.logAction({
      userId: user.userId,
      action: "venue_created",
      entityType: "venue",
      entityId: result.insertedId.toString(),
      details: { name, type, building },
      timestamp: now,
    });

    return NextResponse.json(
      { id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    console.error("Venue creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
