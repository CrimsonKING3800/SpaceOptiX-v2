"use client"

import { useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, User, LogOut, CalendarCheck, CalendarX, CalendarPlus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Notification {
  _id: string
  action: string
  details: Record<string, unknown>
  timestamp: string
  entity_type: string
}

const actionLabels: Record<string, { label: string; icon: typeof CalendarPlus }> = {
  booking_created: { label: "Booking created", icon: CalendarPlus },
  booking_submitted: { label: "Booking submitted for approval", icon: Clock },
  booking_approved: { label: "Booking approved", icon: CalendarCheck },
  booking_rejected: { label: "Booking rejected", icon: CalendarX },
  booking_cancelled: { label: "Booking cancelled", icon: CalendarX },
  approval_professor_approved: { label: "Professor approved your booking", icon: CalendarCheck },
  approval_professor_rejected: { label: "Professor rejected your booking", icon: CalendarX },
  approval_admin_approved: { label: "Admin approved your booking", icon: CalendarCheck },
  approval_admin_rejected: { label: "Admin rejected your booking", icon: CalendarX },
  approval_professor_pending: { label: "Booking sent to professor", icon: Clock },
  approval_admin_pending: { label: "Booking sent to admin", icon: Clock },
}

export function DashboardHeader({ title, description }: { title: string; description?: string }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)

  const { data: notifData } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 30000,
  })
  const notifications: Notification[] = notifData?.notifications || []

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-heading text-sm font-semibold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">Recent booking updates</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif) => {
                    const config = actionLabels[notif.action] || {
                      label: notif.action.replace(/_/g, " "),
                      icon: Clock,
                    }
                    const IconComponent = config.icon
                    const isApproval = notif.action.includes("approved")
                    const isRejection = notif.action.includes("rejected")
                    return (
                      <div key={notif._id} className="flex items-start gap-3 px-4 py-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isApproval
                              ? "bg-emerald-500/10 text-emerald-500"
                              : isRejection
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          {notif.details?.title && (
                            <p className="text-xs text-muted-foreground truncate">
                              {String(notif.details.title)}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground/70">
                            {new Date(notif.timestamp).toLocaleDateString()} ·{" "}
                            {new Date(notif.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push("/dashboard/profile")}
            >
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
