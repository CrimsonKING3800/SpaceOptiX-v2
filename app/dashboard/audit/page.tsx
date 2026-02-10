"use client"

import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollText, User, Clock } from "lucide-react"
import type { AuditLog } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  approve: "default",
  reject: "destructive",
  login: "outline",
  register: "outline",
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
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log._id}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ScrollText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionColors[log.action] || "outline"} className="capitalize">
                        {log.action}
                      </Badge>
                      <span className="text-sm font-medium text-foreground capitalize">
                        {log.entity_type}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user?.name || log.user_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="mt-2 max-h-20 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
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
