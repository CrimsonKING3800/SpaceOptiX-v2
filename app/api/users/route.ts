import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const db = await getDb()
    const users = await db
      .collection("users")
      .find()
      .project({ password: 0 })
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      users: users.map((u) => ({ ...u, _id: u._id.toString() })),
    })
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
