import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  Approval,
  ApprovalStage,
  ApprovalStatus,
  BookingStatus,
} from "@/lib/models";
import * as auditService from "./audit.service";

export interface ApprovalQueueFilter {
  stage?: ApprovalStage;
  status?: ApprovalStatus | "all" | "pending" | "pending_professor" | "pending_admin";
  limit?: number;
}

export interface ApprovalDecision {
  status: ApprovalStatus;
  comments?: string;
}

/**
 * Get pending/approved/rejected approvals for a professor or admin.
 * Supports filtering by status: pending (default), approved, rejected, all.
 */
export async function getApprovalsQueue(
  userId: string,
  userRole: string,
  filters: ApprovalQueueFilter = {},
): Promise<any[]> {
  const db = await getDb();

  // Only professor and admin can view approvals
  if (userRole !== "professor" && userRole !== "admin") {
    throw new Error(
      "Unauthorized: only professor and admin can view approvals",
    );
  }

  const { limit = 50, status } = filters;

  const query: Record<string, unknown> = {};

  if (status === "approved") {
    query.status = "approved";
  } else if (status === "rejected") {
    query.status = "rejected";
  } else if (status === "all") {
    // No status filter — return all bookings
  } else {
    // Default: pending bookings
    const statusQuery: BookingStatus[] = ["pending_professor"];
    if (userRole === "admin") {
      statusQuery.push("pending_admin");
    }
    query.status = { $in: statusQuery };
  }

  const bookings = await db
    .collection("bookings")
    .find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  return bookings as any[];
}

/**
 * Get a single booking pending approval by ID.
 */
export async function getApprovalBooking(bookingId: string): Promise<any> {
  const db = await getDb();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(bookingId);
  } catch {
    return null;
  }

  const booking = await db.collection("bookings").findOne({ _id: objectId });
  return booking;
}

/**
 * Approve or reject a booking at a specific stage (professor or admin).
 * Handles the workflow transition:
 *  - pending_professor + approve → pending_admin (unless auto-approved)
 *  - pending_admin + approve → approved
 *  - Any stage + reject → rejected
 */
export async function decideApproval(
  bookingId: string,
  userId: string,
  userRole: string,
  decision: ApprovalDecision,
): Promise<void> {
  const db = await getDb();

  if (userRole !== "professor" && userRole !== "admin") {
    throw new Error("Unauthorized: only professor and admin can approve");
  }

  if (!["approved", "rejected"].includes(decision.status)) {
    throw new Error("Invalid approval status");
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(bookingId);
  } catch {
    throw new Error("Invalid booking ID");
  }

  const booking = await db.collection("bookings").findOne({ _id: objectId });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const bookingStatus = booking.status as BookingStatus;

  // Validate that the current user can approve at this stage
  if (userRole === "professor" && bookingStatus !== "pending_professor") {
    throw new Error(
      "Professor can only approve bookings in pending_professor status",
    );
  }
  if (userRole === "admin" && bookingStatus !== "pending_admin") {
    throw new Error("Admin can only approve bookings in pending_admin status");
  }

  const now = new Date().toISOString();

  // Determine new booking status
  let newBookingStatus: BookingStatus;
  if (decision.status === "rejected") {
    newBookingStatus = "rejected";
  } else if (bookingStatus === "pending_professor") {
    // Professor approved → move to pending_admin
    newBookingStatus = "pending_admin";
  } else {
    // Admin approved → move to approved
    newBookingStatus = "approved";
  }

  // Update booking status
  const updateData: Record<string, unknown> = {
    status: newBookingStatus,
    updated_at: now,
  };

  if (decision.status === "rejected" && decision.comments) {
    updateData.rejection_reason = decision.comments;
  }

  await db
    .collection("bookings")
    .updateOne({ _id: objectId }, { $set: updateData });

  // Create/update approval record
  const approvalStage: ApprovalStage =
    userRole === "professor" ? "professor" : "admin";

  const existingApproval = await db.collection("approvals").findOne({
    booking_id: bookingId,
    stage: approvalStage,
  });

  if (existingApproval) {
    // Update existing approval
    await db.collection("approvals").updateOne(
      {
        booking_id: bookingId,
        stage: approvalStage,
      },
      {
        $set: {
          approver_id: userId,
          status: decision.status,
          comments: decision.comments || null,
          decided_at: now,
          updated_at: now,
        },
      },
    );
  } else {
    // Create new approval
    await db.collection("approvals").insertOne({
      booking_id: bookingId,
      approver_id: userId,
      stage: approvalStage,
      status: decision.status,
      comments: decision.comments || null,
      decided_at: now,
      created_at: now,
    });
  }

  // Audit log with proper action enum
  let auditAction: any = "approval_professor_pending";
  if (userRole === "professor" && decision.status === "approved") {
    auditAction = "approval_professor_approved";
  } else if (userRole === "professor" && decision.status === "rejected") {
    auditAction = "approval_professor_rejected";
  } else if (userRole === "admin" && decision.status === "approved") {
    auditAction = "approval_admin_approved";
  } else if (userRole === "admin" && decision.status === "rejected") {
    auditAction = "approval_admin_rejected";
  }

  await auditService.logAction({
    userId,
    action: auditAction,
    entityType: "booking",
    entityId: bookingId,
    details: {
      approver_role: userRole,
      stage: approvalStage,
      decision: decision.status,
      comments: decision.comments || null,
      new_booking_status: newBookingStatus,
    },
    timestamp: now,
  });
}

/**
 * Get approval history for a booking.
 */
export async function getApprovals(bookingId: string): Promise<Approval[]> {
  const db = await getDb();

  const approvals = await db
    .collection("approvals")
    .find({ booking_id: bookingId })
    .sort({ created_at: -1 })
    .toArray();

  return approvals.map((approval) => ({
    ...(approval as Record<string, unknown>),
    _id: approval._id.toString(),
  })) as Approval[];
}
