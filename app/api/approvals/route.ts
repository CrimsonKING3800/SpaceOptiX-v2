import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "professor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "pending"
    const limit = parseInt(searchParams.get("limit") || "50")

    const db = await getDb()
    const query: Record<string, unknown> = {}
    if (status !== "all") {
      query.status = status
    }
    // Only show student bookings for approval (not auto-approved professor bookings)
    query.status = status === "all" ? { $in: ["pending", "approved", "rejected"] } : status

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    // Populate user info
    const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))]
    const users = userIds.length > 0
      ? await db
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => { try { return new ObjectId(id) } catch { return id } }) } })
          .project({ password: 0 })
          .toArray()
      : []
    const userMap = new Map(users.map((u) => [u._id.toString(), u]))

    // Populate venue info
    const venueIds = [...new Set(bookings.map((b) => b.venue_id).filter(Boolean))]
    const venues = venueIds.length > 0
      ? await db
          .collection("venues")
          .find({ _id: { $in: venueIds.map((id) => { try { return new ObjectId(id) } catch { return id } }) } })
          .toArray()
      : []
    const venueMap = new Map(venues.map((v) => [v._id.toString(), v]))

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        ...b,
        _id: b._id.toString(),
        user: userMap.get(b.user_id) ? { ...userMap.get(b.user_id), _id: b.user_id } : null,
        venue: venueMap.get(b.venue_id) ? { ...venueMap.get(b.venue_id), _id: b.venue_id } : null,
      })),
    })
  } catch (error) {
    console.error("Approvals fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
