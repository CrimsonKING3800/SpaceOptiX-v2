import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    const existingVenues = await db.collection("venues").countDocuments();
    if (existingVenues > 0 && !force) {
      return NextResponse.json({ message: "Database already seeded" });
    }

    if (force) {
      await Promise.all([
        db.collection("venues").deleteMany({}),
        db.collection("users").deleteMany({}),
        db.collection("bookings").deleteMany({}),
        db.collection("approvals").deleteMany({}),
        db.collection("audit_logs").deleteMany({}),
      ]);
    }

    const now = new Date().toISOString();

    const venues = [
      {
        name: "Lecture Hall A",
        type: "auditorium",
        building: "Main Building",
        floor: 1,
        capacity: 200,
        amenities: ["Projector", "Microphone", "Whiteboard", "AC"],
        availability_hours: { start: "08:00", end: "20:00" },
        description:
          "Large lecture hall with tiered seating and full AV setup.",
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
        description:
          "Professional conference room for meetings and presentations.",
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
        description:
          "Multi-purpose sports hall for indoor activities and events.",
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
        description:
          "Beautiful open-air amphitheatre for cultural events and gatherings.",
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
        description:
          "Seminar room ideal for research presentations and group discussions.",
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
    ];

    await db.collection("venues").insertMany(venues);

    const adminPassword = await hashPassword("admin123");
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
    });

    const profPassword = await hashPassword("professor123");
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
    });

    const studentPassword = await hashPassword("student123");
    const studentUser = await db.collection("users").insertOne({
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
    });

    // Get venue IDs for sample bookings
    const venueIds = await db
      .collection("venues")
      .find({})
      .project({ _id: 1 })
      .limit(3)
      .toArray();

    // Create sample bookings with new schema
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    const nextDay = new Date(new Date().getTime() + 48 * 60 * 60 * 1000);

    const sampleBookings = [
      {
        requester_id: studentUser.insertedId.toString(),
        user_id: studentUser.insertedId.toString(), // Keep legacy field for backward compat
        venue_id: venueIds[0]._id.toString(),
        title: "CS101 Lab Session",
        description: "Practical lab for data structures course",
        purpose: "Academic",
        organization: "Department of Computer Science",
        startAt: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          9,
          0,
          0,
        ).toISOString(),
        endAt: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          11,
          0,
          0,
        ).toISOString(),
        status: "pending_professor",
        attendees_count: 30,
        rejection_reason: null,
        created_at: now,
        updated_at: now,
      },
      {
        requester_id: studentUser.insertedId.toString(),
        user_id: studentUser.insertedId.toString(),
        venue_id: venueIds[1]._id.toString(),
        title: "Student Society Meeting",
        description: "Monthly planning meeting for tech club",
        purpose: "Club Activity",
        organization: "Tech Club",
        startAt: new Date(
          nextDay.getFullYear(),
          nextDay.getMonth(),
          nextDay.getDate(),
          14,
          0,
          0,
        ).toISOString(),
        endAt: new Date(
          nextDay.getFullYear(),
          nextDay.getMonth(),
          nextDay.getDate(),
          15,
          30,
          0,
        ).toISOString(),
        status: "pending_professor",
        attendees_count: 25,
        rejection_reason: null,
        created_at: now,
        updated_at: now,
      },
      {
        requester_id: studentUser.insertedId.toString(),
        user_id: studentUser.insertedId.toString(),
        venue_id: venueIds[2]._id.toString(),
        title: "Approved Event Example",
        description: "Already approved booking for demonstration",
        purpose: "Academic",
        organization: "Department",
        startAt: new Date(
          new Date().getTime() + 72 * 60 * 60 * 1000,
        ).toISOString(),
        endAt: new Date(
          new Date().getTime() + 74 * 60 * 60 * 1000,
        ).toISOString(),
        status: "approved",
        attendees_count: 15,
        rejection_reason: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const bookingResult = await db
      .collection("bookings")
      .insertMany(sampleBookings);

    // Create sample approvals for demonstration
    await db.collection("approvals").insertMany([
      {
        booking_id: bookingResult.insertedIds[2].toString(),
        approver_id: "admin_id_placeholder",
        stage: "professor",
        status: "approved",
        comments: "Approved by professor",
        decided_at: now,
        created_at: now,
      },
    ]);

    return NextResponse.json({
      message: "Database seeded successfully",
      seeded: {
        venues: venues.length,
        users: 3,
        bookings: sampleBookings.length,
        approvals: 1,
      },
      demo_accounts: [
        { email: "admin@spaceoptix.edu", password: "admin123", role: "admin" },
        {
          email: "sarah@spaceoptix.edu",
          password: "professor123",
          role: "professor",
        },
        {
          email: "alex@spaceoptix.edu",
          password: "student123",
          role: "student",
        },
      ],  
      demo_bookings:
        "Sample bookings for Alex Johnson created with pending_professor status for testing approval workflow",
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
