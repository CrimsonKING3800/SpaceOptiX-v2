import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const db = await getDb()
    const isAdmin = user.role === "admin"
    const bookingQuery = isAdmin ? {} : { user_id: user.userId }
    const today = new Date().toISOString().split("T")[0]

    const [totalBookings, pendingBookings, approvedBookings, upcomingBookings] = await Promise.all([
      db.collection("bookings").countDocuments(bookingQuery),
      db.collection("bookings").countDocuments({ ...bookingQuery, status: "pending" }),
      db.collection("bookings").countDocuments({
        ...bookingQuery,
        status: { $in: ["approved", "auto-approved"] },
      }),
      db.collection("bookings").countDocuments({
        ...bookingQuery,
        status: { $in: ["approved", "auto-approved"] },
        date: { $gte: today },
      }),
    ])

    const stats: Record<string, number> = {
      total_bookings: totalBookings,
      pending_bookings: pendingBookings,
      approved_bookings: approvedBookings,
      upcoming_bookings: upcomingBookings,
    }

    if (isAdmin) {
      const [totalVenues, totalUsers] = await Promise.all([
        db.collection("venues").countDocuments({ is_active: true }),
        db.collection("users").countDocuments(),
      ])
      stats.total_venues = totalVenues
      stats.total_users = totalUsers
    }

    if (user.role === "professor" || isAdmin) {
      const pendingApprovals = await db.collection("bookings").countDocuments({ status: "pending" })
      stats.pending_approvals = pendingApprovals
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
