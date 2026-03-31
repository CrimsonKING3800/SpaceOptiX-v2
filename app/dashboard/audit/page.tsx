"use client"

import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ScrollText,
  User,
  Clock,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  Building2,
  UserPlus,
  LogIn,
  LogOut,
  Pencil,
  Send,
  Shield,
  Hash,
} from "lucide-react"
import type { AuditLog } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const actionConfig: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: typeof ScrollText
    color: string
  }
> = {
  booking_created: {
    label: "Booking Created",
    variant: "secondary",
    icon: CalendarPlus,
    color: "bg-blue-500/10 text-blue-500",
  },
  booking_submitted: {
    label: "Booking Submitted",
    variant: "secondary",
    icon: Send,
    color: "bg-blue-500/10 text-blue-500",
  },
  booking_approved: {
    label: "Booking Approved",
    variant: "default",
    icon: CalendarCheck,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  booking_rejected: {
    label: "Booking Rejected",
    variant: "destructive",
    icon: CalendarX,
    color: "bg-destructive/10 text-destructive",
  },
  booking_cancelled: {
    label: "Booking Cancelled",
    variant: "outline",
    icon: CalendarX,
    color: "bg-muted text-muted-foreground",
  },
  approval_professor_pending: {
    label: "Sent to Professor",
    variant: "secondary",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-500",
  },
  approval_admin_pending: {
    label: "Sent to Admin",
    variant: "secondary",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-500",
  },
  approval_professor_approved: {
    label: "Professor Approved",
    variant: "default",
    icon: Shield,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  approval_professor_rejected: {
    label: "Professor Rejected",
    variant: "destructive",
    icon: CalendarX,
    color: "bg-destructive/10 text-destructive",
  },
  approval_admin_approved: {
    label: "Admin Approved",
    variant: "default",
    icon: Shield,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  approval_admin_rejected: {
    label: "Admin Rejected",
    variant: "destructive",
    icon: CalendarX,
    color: "bg-destructive/10 text-destructive",
  },
  venue_created: {
    label: "Venue Created",
    variant: "default",
    icon: Building2,
    color: "bg-violet-500/10 text-violet-500",
  },
  venue_updated: {
    label: "Venue Updated",
    variant: "secondary",
    icon: Pencil,
    color: "bg-violet-500/10 text-violet-500",
  },
  venue_deactivated: {
    label: "Venue Deactivated",
    variant: "destructive",
    icon: Building2,
    color: "bg-destructive/10 text-destructive",
  },
  user_registered: {
    label: "User Registered",
    variant: "outline",
    icon: UserPlus,
    color: "bg-sky-500/10 text-sky-500",
  },
  user_login: {
    label: "User Login",
    variant: "outline",
    icon: LogIn,
    color: "bg-muted text-muted-foreground",
  },
  user_logout: {
    label: "User Logout",
    variant: "outline",
    icon: LogOut,
    color: "bg-muted text-muted-foreground",
  },
  user_updated: {
    label: "User Updated",
    variant: "secondary",
    icon: Pencil,
    color: "bg-sky-500/10 text-sky-500",
  },
}

const detailLabels: Record<string, string> = {
  title: "Title",
  name: "Name",
  type: "Type",
  building: "Building",
  venue_name: "Venue",
  status: "Status",
  decision: "Decision",
  stage: "Stage",
  approver_role: "Approver Role",
  new_booking_status: "New Status",
  comments: "Comments",
  method: "Method",
  batch_size: "Batch Size",
  reason: "Reason",
  rejection_reason: "Rejection Reason",
  email: "Email",
  role: "Role",
  department: "Department",
  is_active: "Active",
  updated_at: "Updated At",
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (key === "updated_at" || key === "created_at" || key === "decided_at") {
    return new Date(value as string).toLocaleString()
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function formatStatusBadge(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function renderDetails(details: Record<string, unknown>) {
  const entries = Object.entries(details).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  )
  if (entries.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {entries.map(([key, value]) => {
        // Skip internal/redundant fields
        if (key === "_id" || key === "ip_address") return null
        const label = detailLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

        return (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">{label}:</span>
            {(key === "decision" || key === "status" || key === "new_booking_status") ? (
              <Badge
                variant={
                  String(value).includes("approved") || String(value).includes("active")
                    ? "default"
                    : String(value).includes("rejected") || String(value).includes("cancelled")
                      ? "destructive"
                      : "secondary"
                }
                className="text-[10px] px-1.5 py-0"
              >
                {formatStatusBadge(String(value))}
              </Badge>
            ) : (
              <span className="font-medium text-foreground">
                {formatDetailValue(key, value)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AuditPage() {
  const { user } = useAuth()
  const { data, isLoading } = useSWR("/api/audit", fetcher)
  const logs: AuditLog[] = data?.logs || []

  if (user?.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div>
      <DashboardHeader title="Audit Logs" description="System activity and change history" />
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <ScrollText className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">No audit logs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Activity will appear here as users interact with the system.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const config = actionConfig[log.action] || {
                label: log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                variant: "outline" as const,
                icon: ScrollText,
                color: "bg-muted text-muted-foreground",
              }
              const IconComponent = config.icon

              return (
                <Card key={log._id} className="transition-colors hover:border-border/80">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.color}`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <span className="text-sm text-muted-foreground">on</span>
                        <span className="flex items-center gap-1 text-sm font-medium text-foreground capitalize">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-mono">
                            <Hash className="h-3 w-3" />
                            {log.entity_id.slice(-6)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user?.name || log.user_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleDateString()} ·{" "}
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && renderDetails(log.details)}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
