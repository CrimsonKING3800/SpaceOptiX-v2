import { NextResponse } from "next/server"

// Mock data for now (replace later with real DB query)
const mockNotifications = [
  {
    id: "n1",
    title: "Booking Approved",
    message: "Lecture Hall A-101 – October 15, 10:00–12:00",
    type: "approved",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    link: "/dashboard/bookings",
  },
  {
    id: "n2",
    title: "Booking Rejected",
    message: "Physics Lab – October 18, 14:00–16:00 (time conflict)",
    type: "rejected",
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    link: "/dashboard/bookings",
  },
  {
    id: "n3",
    title: "New Approval Request",
    message: "Waiting for your review: Seminar Room – October 20",
    type: "pending_approval",
    read: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    link: "/dashboard/approvals",
  },
]

export async function GET() {
  // Later: filter by current user
  return NextResponse.json({
    notifications: mockNotifications,
    unreadCount: mockNotifications.filter(n => !n.read).length,
  })
}

// Optional: mark as read (we'll use it later)
export async function POST(request: Request) {
  const { id } = await request.json()
  // In real app: update DB
  console.log("Mark as read:", id)
  return NextResponse.json({ success: true })
}