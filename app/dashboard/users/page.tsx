"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Mail, Shield, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  professor: "secondary",
  student: "outline",
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const { data, isLoading } = useSWR("/api/users", fetcher)
  const users: User[] = data?.users || []

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    )
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (res.ok) {
        toast.success(`User ${!isActive ? "activated" : "deactivated"}`)
        mutate("/api/users")
      } else {
        toast.error("Failed to update user")
      }
    } catch {
      toast.error("Network error")
    }
  }

  return (
    <div>
      <DashboardHeader title="User Management" description="Manage all registered users" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="professor">Professors</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Users className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <Card key={u._id}>
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-semibold text-primary">
                        {u.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{u.name}</h3>
                        <Badge variant={roleColors[u.role] || "outline"} className="capitalize">
                          {u.role}
                        </Badge>
                        {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {u.department}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={u.is_active ? "outline" : "default"}
                      className="gap-1.5"
                      onClick={() => handleToggleActive(u._id, u.is_active)}
                    >
                      {u.is_active ? (
                        <>
                          <UserX className="h-3.5 w-3.5" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
