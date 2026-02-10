import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status")
    const all = searchParams.get("all") === "true"

    const db = await getDb()
    const query: Record<string, unknown> = {}

    if (!all || user.role !== "admin") {
      query.user_id = user.userId
    }
    if (status && status !== "all") {
      query.status = status
    }

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    const venueIds = [...new Set(bookings.map((b) => b.venue_id).filter(Boolean))]
    const venues = venueIds.length > 0
      ? await db
          .collection("venues")
          .find({ _id: { $in: venueIds.map((id) => { try { return new ObjectId(id) } catch { return id } }) } })
          .toArray()
      : []

    const venueMap = new Map(venues.map((v) => [v._id.toString(), v]))

    const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))]
    const users = userIds.length > 0
      ? await db
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => { try { return new ObjectId(id) } catch { return id } }) } })
          .project({ password: 0 })
          .toArray()
      : []
    const userMap = new Map(users.map((u) => [u._id.toString(), u]))

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        ...b,
        _id: b._id.toString(),
        venue: venueMap.get(b.venue_id) ? { ...venueMap.get(b.venue_id), _id: b.venue_id } : null,
        user: userMap.get(b.user_id) ? { ...userMap.get(b.user_id), _id: b.user_id } : null,
      })),
    })
  } catch (error) {
    console.error("Bookings fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { venue_id, title, description, date, start_time, end_time, attendees_count, purpose } = body

    if (!venue_id || !title || !date || !start_time || !end_time || !purpose) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()

    // Check for conflicts
    const conflict = await db.collection("bookings").findOne({
      venue_id,
      date,
      status: { $in: ["pending", "approved", "auto-approved"] },
      $or: [
        { start_time: { $lt: end_time }, end_time: { $gt: start_time } },
      ],
    })

    if (conflict) {
      return NextResponse.json(
        { error: "Time slot conflict. This venue is already booked for the selected time." },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const autoApprove = user.role === "professor" || user.role === "admin"

    const result = await db.collection("bookings").insertOne({
      user_id: user.userId,
      venue_id,
      title,
      description: description || null,
      date,
      start_time,
      end_time,
      status: autoApprove ? "auto-approved" : "pending",
      attendees_count: attendees_count || 1,
      purpose,
      rejection_reason: null,
      created_at: now,
      updated_at: now,
    })

    await db.collection("audit_logs").insertOne({
      user_id: user.userId,
      action: "create",
      entity_type: "booking",
      entity_id: result.insertedId.toString(),
      details: { title, venue_id, date, status: autoApprove ? "auto-approved" : "pending" },
      timestamp: now,
    })

    return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    console.error("Booking creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
