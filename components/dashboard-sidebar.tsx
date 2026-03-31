"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  ClipboardCheck,
  Users,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navItems = {
  student: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/venues", label: "Explore Venues", icon: MapPin },
    { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarDays },
    { href: "/dashboard/book", label: "Book a Venue", icon: Building2 },
  ],
  professor: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/approvals", label: "Approval Requests", icon: ClipboardCheck },
    { href: "/dashboard/venues", label: "Explore Venues", icon: MapPin },
    { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarDays },
    { href: "/dashboard/book", label: "Book a Venue", icon: Building2 },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/venues", label: "Venue Management", icon: Building2 },
    { href: "/dashboard/bookings", label: "All Bookings", icon: CalendarDays },
    { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck },
    { href: "/dashboard/users", label: "User Management", icon: Users },
    { href: "/dashboard/audit", label: "Audit Logs", icon: ScrollText },
  ],
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const items = navItems[user.role] || navItems.student

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-sidebar-primary-foreground">
              SpaceOptiX
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent px-3 py-2">
            <p className="text-xs font-medium text-sidebar-accent-foreground">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/70 capitalize">{user.role}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
