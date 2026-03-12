export * from "./models/index";
import type { Booking, User } from "./models/index";

export interface DashboardStats {
  total_bookings: number;
  pending_bookings: number;
  pending_professor: number;
  pending_admin: number;
  pending_approvals?: number;
  approved_bookings: number;
  rejected_bookings: number;
  total_venues: number;
  available_venues: number;
  total_users?: number;
  upcoming_bookings: number;
  updated_at?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface BookingConflict {
  exists: boolean;
  conflictingBooking?: Booking;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, "password">;
}

export interface BookingCreateRequest {
  venue_id: string;
  title: string;
  description?: string;
  purpose: string;
  organization?: string;
  startAt: string;
  endAt: string;
  attendees_count: number;
}

export interface BookingUpdateRequest {
  title?: string;
  description?: string;
  purpose?: string;
  organization?: string;
  startAt?: string;
  endAt?: string;
  attendees_count?: number;
}

export interface ApprovalRequest {
  action: "approve" | "reject";
  comments?: string;
}
