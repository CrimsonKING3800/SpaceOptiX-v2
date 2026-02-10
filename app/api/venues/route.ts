import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const db = await getDb()
    const venues = await db.collection("venues").find({ is_active: true }).toArray()
    return NextResponse.json({
      venues: venues.map((v) => ({ ...v, _id: v._id.toString() })),
    })
  } catch (error) {
    console.error("Venues fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, building, floor, capacity, amenities, availability_hours, description } = body

    if (!name || !type || !building || floor === undefined || !capacity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()
    const now = new Date().toISOString()

    const result = await db.collection("venues").insertOne({
      name,
      type,
      building,
      floor: parseInt(floor),
      capacity: parseInt(capacity),
      amenities: amenities || [],
      availability_hours: availability_hours || { start: "08:00", end: "22:00" },
      description: description || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    await db.collection("audit_logs").insertOne({
      user_id: user.userId,
      action: "create",
      entity_type: "venue",
      entity_id: result.insertedId.toString(),
      details: { name, type, building },
      timestamp: now,
    })

    return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    console.error("Venue creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
