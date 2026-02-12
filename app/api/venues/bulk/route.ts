import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { venues } = await request.json()

    if (!venues || !Array.isArray(venues) || venues.length === 0) {
      return NextResponse.json({ error: "No venues provided" }, { status: 400 })
    }

    const db = await getDb()
    const now = new Date().toISOString()

    // Validate and format venues
    const formattedVenues = venues.map((venue) => {
      if (!venue.name || !venue.type || !venue.building) {
        throw new Error(`Invalid venue: missing required fields in ${venue.name || "unnamed venue"}`)
      }

      return {
        name: venue.name,
        type: venue.type,
        building: venue.building,
        floor: parseInt(venue.floor) || 1,
        capacity: parseInt(venue.capacity) || 30,
        amenities: Array.isArray(venue.amenities) ? venue.amenities : venue.amenities?.split(",").map((a: string) => a.trim()).filter(Boolean) || [],
        availability_hours: venue.availability_hours || { start: "08:00", end: "22:00" },
        description: venue.description || null,
        is_active: true,
        created_at: now,
        updated_at: now,
      }
    })

    // Bulk insert
    const result = await db.collection("venues").insertMany(formattedVenues)

    // Create audit logs for each venue
    const auditLogs = formattedVenues.map((venue, index) => ({
      user_id: user.userId,
      action: "create",
      entity_type: "venue",
      entity_id: result.insertedIds[index].toString(),
      details: { name: venue.name, type: venue.type, building: venue.building },
      timestamp: now,
    }))

    await db.collection("audit_logs").insertMany(auditLogs)

    return NextResponse.json(
      {
        success: true,
        inserted: result.insertedCount,
        ids: Object.values(result.insertedIds).map((id) => id.toString()),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Bulk add error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add venues" },
      { status: 500 }
    )
  }
}