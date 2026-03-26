import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role, department, phone, student_id, faculty_id } = body

    if (!name || !email || !password || !role || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Only allow IIT KGP emails
    if (!email.toLowerCase().endsWith(".iitkgp.ac.in")) {
      return NextResponse.json(
        { error: "Only IIT Kharagpur emails (@*.iitkgp.ac.in) are allowed to register" },
        { status: 400 },
      )
    }

    const db = await getDb()
    const existing = await db.collection("users").findOne({ email })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const now = new Date().toISOString()

    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      phone: phone || null,
      student_id: student_id || null,
      faculty_id: faculty_id || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    const user = {
      _id: result.insertedId.toString(),
      name,
      email,
      role,
      department,
      is_active: true,
    }

    const token = generateToken(user as Parameters<typeof generateToken>[0])
    await setAuthCookie(token)

    return NextResponse.json({
      user: { userId: user._id, email: user.email, role: user.role, name: user.name },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
