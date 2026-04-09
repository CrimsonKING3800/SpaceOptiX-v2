export type UserRole = "student" | "professor" | "admin";

export type BookingStatus =
  | "draft"
  | "pending_professor"
  | "pending_admin"
  | "approved"
  | "rejected"
  | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalStage = "professor" | "admin";

export type VenueType =
  | "classroom"
  | "lab"
  | "auditorium"
  | "conference_room"
  | "sports_facility"
  | "open_area";

export type AuditAction =
  | "booking_created"
  | "booking_submitted"
  | "booking_approved"
  | "booking_rejected"
  | "booking_cancelled"
  | "approval_professor_pending"
  | "approval_admin_pending"
  | "approval_professor_approved"
  | "approval_professor_rejected"
  | "approval_admin_approved"
  | "approval_admin_rejected"
  | "venue_created"
  | "venue_updated"
  | "venue_deactivated"
  | "user_registered"
  | "user_login"
  | "user_logout"
  | "user_updated";

export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department: string;
  phone?: string;
  student_id?: string;
  faculty_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PendingUserVerification {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  phone?: string | null;
  student_id?: string | null;
  faculty_id?: string | null;
  otp_hash: string;
  otp_expires_at: Date;
  last_otp_sent_at: Date;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  _id: string;
  name: string;
  type: VenueType;
  building: string;
  floor: number;
  capacity: number;
  amenities: string[];
  availability_hours: {
    start: string;
    end: string;
  };
  is_active: boolean;
  image_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  _id: string;
  requester_id: string;
  requester?: User;
  venue_id: string;
  venue?: Venue;
  title: string;
  description?: string;
  purpose: string;
  organization?: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  attendees_count: number;
  rejection_reason?: string;
  approvals?: Approval[];
  created_at: string;
  updated_at: string;
}

export interface Approval {
  _id: string;
  booking_id: string;
  booking?: Booking;
  approver_id: string;
  approver?: User;
  stage: ApprovalStage;
  status: ApprovalStatus;
  comments?: string;
  decided_at?: string;
  created_at: string;
}

export interface AuditLog {
  _id: string;
  user_id: string;
  user?: User;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  timestamp: string;
}
