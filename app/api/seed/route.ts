import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { hashPassword } from "@/lib/auth"

export async function POST() {
  try {
    const db = await getDb()

    const existingVenues = await db.collection("venues").countDocuments()
    if (existingVenues > 0) {
      return NextResponse.json({ message: "Database already seeded" })
    }

    const now = new Date().toISOString()

    const venues = [
      {
        name: "Lecture Hall A",
        type: "auditorium",
        building: "Main Building",
        floor: 1,
        capacity: 200,
        amenities: ["Projector", "Microphone", "Whiteboard", "AC"],
        availability_hours: { start: "08:00", end: "20:00" },
        description: "Large lecture hall with tiered seating and full AV setup.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Computer Lab 101",
        type: "lab",
        building: "Science Block",
        floor: 1,
        capacity: 40,
        amenities: ["Computers", "Projector", "AC", "Whiteboard"],
        availability_hours: { start: "09:00", end: "21:00" },
        description: "Fully equipped computer lab with 40 workstations.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Conference Room B",
        type: "conference_room",
        building: "Admin Block",
        floor: 2,
        capacity: 20,
        amenities: ["Projector", "Video Conferencing", "Whiteboard", "AC"],
        availability_hours: { start: "08:00", end: "18:00" },
        description: "Professional conference room for meetings and presentations.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Classroom 201",
        type: "classroom",
        building: "Academic Block",
        floor: 2,
        capacity: 60,
        amenities: ["Projector", "Whiteboard", "AC"],
        availability_hours: { start: "08:00", end: "18:00" },
        description: "Standard classroom with modern teaching facilities.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Sports Complex Hall",
        type: "sports_facility",
        building: "Sports Block",
        floor: 0,
        capacity: 150,
        amenities: ["Indoor Court", "Sound System", "Lighting"],
        availability_hours: { start: "06:00", end: "22:00" },
        description: "Multi-purpose sports hall for indoor activities and events.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Open Amphitheatre",
        type: "open_area",
        building: "Central Campus",
        floor: 0,
        capacity: 300,
        amenities: ["Stage", "Sound System", "Open Seating"],
        availability_hours: { start: "07:00", end: "21:00" },
        description: "Beautiful open-air amphitheatre for cultural events and gatherings.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Seminar Room 301",
        type: "conference_room",
        building: "Research Block",
        floor: 3,
        capacity: 30,
        amenities: ["Projector", "Whiteboard", "Video Conferencing", "AC"],
        availability_hours: { start: "09:00", end: "19:00" },
        description: "Seminar room ideal for research presentations and group discussions.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Physics Lab",
        type: "lab",
        building: "Science Block",
        floor: 2,
        capacity: 35,
        amenities: ["Lab Equipment", "Projector", "Safety Equipment", "AC"],
        availability_hours: { start: "09:00", end: "17:00" },
        description: "Advanced physics laboratory with experimental setups.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]

    await db.collection("venues").insertMany(venues)

    const adminPassword = await hashPassword("admin123")
    await db.collection("users").insertOne({
      name: "System Admin",
      email: "admin@spaceoptix.edu",
      password: adminPassword,
      role: "admin",
      department: "Administration",
      phone: null,
      student_id: null,
      faculty_id: "ADM001",
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    const profPassword = await hashPassword("professor123")
    await db.collection("users").insertOne({
      name: "Dr. Sarah Mitchell",
      email: "sarah@spaceoptix.edu",
      password: profPassword,
      role: "professor",
      department: "Computer Science",
      phone: null,
      student_id: null,
      faculty_id: "FAC001",
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    const studentPassword = await hashPassword("student123")
    await db.collection("users").insertOne({
      name: "Alex Johnson",
      email: "alex@spaceoptix.edu",
      password: studentPassword,
      role: "student",
      department: "Computer Science",
      phone: null,
      student_id: "STU2024001",
      faculty_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    return NextResponse.json({
      message: "Database seeded successfully",
      demo_accounts: [
        { email: "admin@spaceoptix.edu", password: "admin123", role: "admin" },
        { email: "sarah@spaceoptix.edu", password: "professor123", role: "professor" },
        { email: "alex@spaceoptix.edu", password: "student123", role: "student" },
      ],
    })
  } catch (error: any) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: "Seed failed", details: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}