import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const db = await getDb()
    const now = new Date().toISOString()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: now }
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.role) updateData.role = body.role

    await db.collection("users").updateOne({ _id: objectId }, { $set: updateData })

    await db.collection("audit_logs").insertOne({
      user_id: user.userId,
      action: "update",
      entity_type: "user",
      entity_id: id,
      details: updateData,
      timestamp: now,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
