export type UserRole = "student" | "professor" | "admin"
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled" | "auto-approved"
export type ApprovalStatus = "pending" | "approved" | "rejected"
export type VenueType = "classroom" | "lab" | "auditorium" | "conference_room" | "sports_facility" | "open_area"

export interface User {
  _id: string
  name: string
  email: string
  password?: string
  role: UserRole
  department: string
  phone?: string
  student_id?: string
  faculty_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Venue {
  _id: string
  name: string
  type: VenueType
  building: string
  floor: number
  capacity: number
  amenities: string[]
  availability_hours: {
    start: string
    end: string
  }
  is_active: boolean
  image_url?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Booking {
  _id: string
  user_id: string
  user?: User
  venue_id: string
  venue?: Venue
  title: string
  description?: string
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
  attendees_count: number
  purpose: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface Approval {
  _id: string
  booking_id: string
  booking?: Booking
  approver_id: string
  approver?: User
  status: ApprovalStatus
  comments?: string
  decided_at?: string
  created_at: string
}

export interface AuditLog {
  _id: string
  user_id: string
  user?: User
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  ip_address?: string
  timestamp: string
}

export interface DashboardStats {
  total_bookings: number
  pending_bookings: number
  approved_bookings: number
  total_venues: number
  available_venues: number
  upcoming_bookings: number
}

export interface TimeSlot {
  start: string
  end: string
  available: boolean
}

export interface AuthResponse {
  token: string
  user: Omit<User, "password">
}
