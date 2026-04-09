"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Building2, Clock, MapPin, XCircle, MessageSquare, CheckCircle2, XOctagon } from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  pending_professor: { variant: "secondary", label: "Pending Professor" },
  pending_admin: { variant: "secondary", label: "Pending Admin" },
  draft: { variant: "outline", label: "Draft" },
  approved: { variant: "default", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading } = useSWR("/api/bookings", fetcher);
  const bookings: Booking[] = data?.bookings || [];

  const filteredBookings =
    statusFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const handleCancel = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("Booking cancelled");
        mutate("/api/bookings");
        mutate("/api/dashboard/stats");
      } else {
        toast.error("Failed to cancel booking");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div>
      <DashboardHeader
        title="My Bookings"
        description="View and manage all your venue reservations"
      />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_professor">
                Pending Professor
              </SelectItem>
              <SelectItem value="pending_admin">Pending Admin</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {filteredBookings.length} booking
            {filteredBookings.length !== 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <CalendarDays className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">
              No bookings found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by booking a venue
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => {
              const cfg = statusConfig[booking.status] || statusConfig.pending;
              return (
                <Card key={booking._id}>
                  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-base font-semibold text-foreground">
                            {booking.title}
                          </h3>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(booking.startAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(booking.startAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" - "}
                            {new Date(booking.endAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {booking.venue && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {booking.venue.name}
                            </span>
                          )}
                        </div>
                        {booking.approvals && booking.approvals.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1">
                            {booking.approvals.map((approval: any) => (
                              <div key={approval._id} className="flex items-center gap-1.5 text-xs">
                                {approval.status === "approved" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <XOctagon className="h-3.5 w-3.5 text-destructive" />
                                )}
                                <span className="font-medium text-foreground">
                                  {approval.stage === "professor" ? "Professor" : "Admin"}
                                </span>
                                <span className={approval.status === "approved" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                                  {approval.status === "approved" ? "Approved" : "Rejected"}
                                </span>
                                {approval.approver?.name && (
                                  <span className="text-muted-foreground">· {approval.approver.name}</span>
                                )}
                                {approval.comments && (
                                  <span className="text-muted-foreground">
                                    — <MessageSquare className="inline h-3 w-3" /> {approval.comments}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {["draft", "pending_professor", "pending_admin"].includes(
                      booking.status,
                    ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
                        onClick={() => handleCancel(booking._id)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
