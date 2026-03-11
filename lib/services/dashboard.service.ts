import { getDb } from "@/lib/mongodb";
import { UserRole } from "@/lib/models";

export interface DashboardUserContext {
  userId: string;
  role: UserRole;
}

export interface DashboardStatsData {
  total_bookings: number;
  pending_bookings: number;
  pending_professor: number;
  pending_admin: number;
  pending_approvals: number;
  approved_bookings: number;
  rejected_bookings: number;
  total_venues: number;
  available_venues: number;
  total_users?: number;
  upcoming_bookings: number;
  updated_at: string;
}

const LEGACY_PENDING_STATUSES = ["pending"];
const TRANSITION_PENDING_STATUSES = ["pending_professor", "pending_admin"];
const APPROVED_STATUSES = ["approved", "auto-approved"];

export async function getStatsForUser(
  user: DashboardUserContext,
): Promise<DashboardStatsData> {
  const db = await getDb();
  const isAdmin = user.role === "admin";

  const bookingScope = isAdmin
    ? {}
    : {
        $or: [{ user_id: user.userId }, { requester_id: user.userId }],
      };

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const nowIso = now.toISOString();

  const [
    totalBookings,
    pendingBookings,
    pendingProfessor,
    pendingAdmin,
    approvedBookings,
    rejectedBookings,
    upcomingBookings,
    totalVenues,
    activeVenues,
    totalUsers,
    pendingApprovals,
  ] = await Promise.all([
    db.collection("bookings").countDocuments(bookingScope),
    db.collection("bookings").countDocuments({
      ...bookingScope,
      status: {
        $in: [...LEGACY_PENDING_STATUSES, ...TRANSITION_PENDING_STATUSES],
      },
    }),
    db.collection("bookings").countDocuments({
      ...bookingScope,
      status: "pending_professor",
    }),
    db.collection("bookings").countDocuments({
      ...bookingScope,
      status: "pending_admin",
    }),
    db.collection("bookings").countDocuments({
      ...bookingScope,
      status: { $in: APPROVED_STATUSES },
    }),
    db.collection("bookings").countDocuments({
      ...bookingScope,
      status: "rejected",
    }),
    db.collection("bookings").countDocuments({
      ...bookingScope,
      status: { $in: APPROVED_STATUSES },
      $or: [{ date: { $gte: today } }, { startAt: { $gte: nowIso } }],
    }),
    db.collection("venues").countDocuments(),
    db.collection("venues").countDocuments({ is_active: true }),
    isAdmin ? db.collection("users").countDocuments() : Promise.resolve(0),
    getPendingApprovalCount(db, user.role),
  ]);

  return {
    total_bookings: totalBookings,
    pending_bookings: pendingBookings,
    pending_professor: pendingProfessor,
    pending_admin: pendingAdmin,
    pending_approvals: pendingApprovals,
    approved_bookings: approvedBookings,
    rejected_bookings: rejectedBookings,
    total_venues: activeVenues,
    available_venues: activeVenues,
    total_users: isAdmin ? totalUsers : undefined,
    upcoming_bookings: upcomingBookings,
    updated_at: nowIso,
  };
}

async function getPendingApprovalCount(
  db: Awaited<ReturnType<typeof getDb>>,
  role: UserRole,
): Promise<number> {
  if (role !== "professor" && role !== "admin") {
    return 0;
  }

  if (role === "admin") {
    return db.collection("bookings").countDocuments({
      status: { $in: ["pending", "pending_admin"] },
    });
  }

  return db.collection("bookings").countDocuments({
    status: { $in: ["pending", "pending_professor"] },
  });
}
