import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const db = await getDb()
    const now = new Date().toISOString()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
    }

    const booking = await db.collection("bookings").findOne({ _id: objectId })
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Only the owner or admin can modify
    if (booking.user_id !== user.userId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: Record<string, unknown> = { updated_at: now }
    if (body.status) updateData.status = body.status
    if (body.rejection_reason) updateData.rejection_reason = body.rejection_reason

    await db.collection("bookings").updateOne({ _id: objectId }, { $set: updateData })

    await db.collection("audit_logs").insertOne({
      user_id: user.userId,
      action: "update",
      entity_type: "booking",
      entity_id: id,
      details: updateData,
      timestamp: now,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Booking update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
