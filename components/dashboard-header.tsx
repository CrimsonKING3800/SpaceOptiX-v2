"use client"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader({ title, description }: { title: string; description?: string }) {
  const { user, logout } = useAuth()   // ← added signOut

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"
const fetcher = (url: string) => fetch(url).then(res => res.json())

const { data, mutate } = useSWR("/api/notifications", fetcher, {
  refreshInterval: 30000, // auto refresh every 30s
})

const notifications = data?.notifications || []
const unreadCount = data?.unreadCount || 0
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="icon" className="relative bg-transparent">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  </PopoverTrigger>

  <PopoverContent className="w-80 p-0" align="end">
    <div className="border-b px-4 py-3">
      <h3 className="font-medium">Notifications</h3>
    </div>

    {notifications.length === 0 ? (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No new notifications
      </div>
    ) : (
      <div className="max-h-[380px] overflow-y-auto">
        {notifications.map((notif: any) => (
          <div
            key={notif.id}
            className={cn(
              "border-b px-4 py-3 hover:bg-muted/50 cursor-pointer",
              !notif.read && "bg-muted/30"
            )}
            onClick={async () => {
              if (!notif.read) {
                await fetch("/api/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: notif.id }),
                })
                mutate() // refresh
              }
              if (notif.link) {
                window.location.href = notif.link
              }
            }}
          >
            <p className="font-medium text-sm">{notif.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{notif.message}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    )}

    {notifications.length > 0 && (
  <div className="p-3 border-t text-center">
    <Button variant="ghost" size="sm" asChild>
      <Link href="/dashboard/bookings">
        View all
      </Link>
    </Button>
  </div>
)}
  </PopoverContent>
</Popover>

        {/* User Avatar → Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <Avatar className="h-9 w-9 border border-border cursor-pointer">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name || "User"}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.role || "User"}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => logout?.()}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
