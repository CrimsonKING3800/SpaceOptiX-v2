import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "professor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const { status, comments } = await request.json()

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

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

    if (booking.status !== "pending") {
      return NextResponse.json({ error: "Booking already processed" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
    }
    if (status === "rejected" && comments) {
      updateData.rejection_reason = comments
    }

    await db.collection("bookings").updateOne({ _id: objectId }, { $set: updateData })

    // Create approval record
    await db.collection("approvals").insertOne({
      booking_id: id,
      approver_id: user.userId,
      status,
      comments: comments || null,
      decided_at: now,
      created_at: now,
    })

    // Audit log
    await db.collection("audit_logs").insertOne({
      user_id: user.userId,
      action: status === "approved" ? "approve" : "reject",
      entity_type: "booking",
      entity_id: id,
      details: { booking_title: booking.title, comments },
      timestamp: now,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approval action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
