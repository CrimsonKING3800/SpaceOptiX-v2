"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  ClipboardCheck,
  Users,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MapPin,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  const router = useRouter()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const items = navItems[user.role] || navItems.student

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

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

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent px-3 py-2">
            <p className="text-xs font-medium text-sidebar-accent-foreground">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/70 capitalize">{user.role}</p>
          </div>
        )}

        {/* Help Button - always visible, even when collapsed */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <HelpCircle className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Help & Guide</span>}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Welcome to SpaceOptiX</DialogTitle>
              <DialogDescription>
                Quick guide to help you navigate and use the platform effectively.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Finding the Right Venue</h3>
                <p className="text-sm text-muted-foreground">
                  Go to <strong>Explore Venues</strong> in the sidebar.  
                  Use the search bar and type filter to quickly find classrooms, labs, auditoriums, sports facilities or open areas.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">2. Booking a Venue</h3>
                <p className="text-sm text-muted-foreground">
                  Click on a venue card → press <strong>Book This Venue</strong>.  
                  Choose your preferred date and time slot → submit the request.  
                  <br />
                  <span className="text-xs text-muted-foreground italic">
                    Student & Professor bookings usually require approval.
                  </span>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">3. Managing Your Bookings</h3>
                <p className="text-sm text-muted-foreground">
                  Visit <strong>My Bookings</strong> to see all your requests: pending, approved, rejected, upcoming and past.  
                  You can view details or cancel bookings (if still allowed).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">4. Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Click your initials/avatar in the top-right corner → select <strong>Profile</strong> to view or update your information.
                </p>
              </div>

              {user.role === "admin" && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Admin Controls</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage venues, review approval requests, handle users, and view audit logs from the respective sidebar sections.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => document.querySelector('button[data-state="open"]')?.click()}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}