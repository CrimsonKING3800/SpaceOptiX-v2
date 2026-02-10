"use client"

import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { StudentDashboard } from "@/components/dashboards/student-dashboard"
import { ProfessorDashboard } from "@/components/dashboards/professor-dashboard"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  const dashboardTitles = {
    student: "Student Dashboard",
    professor: "Professor Dashboard",
    admin: "Admin Dashboard",
  }

  const dashboardDescriptions = {
    student: "Manage your venue bookings and explore campus spaces",
    professor: "Review approvals and manage your bookings",
    admin: "Oversee all campus venue operations",
  }

  return (
    <div>
      <DashboardHeader
        title={dashboardTitles[user.role]}
        description={dashboardDescriptions[user.role]}
      />
      <div className="p-6">
        {user.role === "student" && <StudentDashboard />}
        {user.role === "professor" && <ProfessorDashboard />}
        {user.role === "admin" && <AdminDashboard />}
      </div>
    </div>
  )
}
