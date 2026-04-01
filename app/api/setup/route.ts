import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const COLLECTIONS_TO_RESET = [
  "bookings",
  "approvals",
  "audit_logs",
  "users",
  "venues",
];

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await getDb();
    const summary: Record<string, string[]> = {
      dropped: [],
      created_indexes: [],
    };

    for (const name of COLLECTIONS_TO_RESET) {
      const exists = await db.listCollections({ name }).hasNext();
      if (exists) {
        await db.collection(name).drop();
        summary.dropped.push(name);
      }
    }

    const bookings = db.collection("bookings");
    await Promise.all([
      bookings.createIndex({ user_id: 1 }),
      bookings.createIndex({ requester_id: 1 }),
      bookings.createIndex({ venue_id: 1 }),
      bookings.createIndex({ status: 1 }),
      bookings.createIndex({ date: 1 }),
      bookings.createIndex({ start_time: 1 }),
      bookings.createIndex({ end_time: 1 }),
      bookings.createIndex({ startAt: 1 }),
      bookings.createIndex({ endAt: 1 }),
      bookings.createIndex({
        venue_id: 1,
        date: 1,
        start_time: 1,
        end_time: 1,
      }),
      bookings.createIndex({ venue_id: 1, startAt: 1, endAt: 1 }),
    ]);
    summary.created_indexes.push(
      "bookings.user_id",
      "bookings.requester_id",
      "bookings.venue_id",
      "bookings.status",
      "bookings.date",
      "bookings.start_time",
      "bookings.end_time",
      "bookings.startAt",
      "bookings.endAt",
      "bookings.(venue_id,date,start_time,end_time)",
      "bookings.(venue_id,startAt,endAt)",
    );

    const approvals = db.collection("approvals");
    await Promise.all([
      approvals.createIndex({ booking_id: 1 }),
      approvals.createIndex({ approver_id: 1 }),
      approvals.createIndex({ booking_id: 1, stage: 1 }),
      approvals.createIndex({ booking_id: 1, stage: 1, status: 1 }),
    ]);
    summary.created_indexes.push(
      "approvals.booking_id",
      "approvals.approver_id",
      "approvals.(booking_id,stage)",
      "approvals.(booking_id,stage,status)",
    );

    const auditLogs = db.collection("audit_logs");
    await Promise.all([
      auditLogs.createIndex({ user_id: 1 }),
      auditLogs.createIndex({ action: 1 }),
      auditLogs.createIndex({ timestamp: -1 }),
    ]);
    summary.created_indexes.push(
      "audit_logs.user_id",
      "audit_logs.action",
      "audit_logs.timestamp",
    );

    const venues = db.collection("venues");
    await Promise.all([
      venues.createIndex({ is_active: 1 }),
      venues.createIndex({ type: 1 }),
      venues.createIndex({ building: 1 }),
    ]);
    summary.created_indexes.push(
      "venues.is_active",
      "venues.type",
      "venues.building",
    );

    const users = db.collection("users");
    await Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      users.createIndex({ role: 1 }),
      users.createIndex({ is_active: 1 }),
    ]);
    summary.created_indexes.push(
      "users.email(unique)",
      "users.role",
      "users.is_active",
    );

    return NextResponse.json({
      message: "Database setup complete",
      ...summary,
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
