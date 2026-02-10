import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const db = await getDb()
    const logs = await db
      .collection("audit_logs")
      .find()
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray()

    // Populate user names
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))]
    const users = userIds.length > 0
      ? await db
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => { try { return new ObjectId(id) } catch { return id } }) } })
          .project({ password: 0, name: 1 })
          .toArray()
      : []
    const userMap = new Map(users.map((u) => [u._id.toString(), u]))

    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        _id: l._id.toString(),
        user: userMap.get(l.user_id) ? { ...userMap.get(l.user_id), _id: l.user_id } : null,
      })),
    })
  } catch (error) {
    console.error("Audit log error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
