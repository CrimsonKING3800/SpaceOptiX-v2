"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  ClipboardCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import type { Booking } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ProfessorDashboard() {
  const { data: statsData } = useSWR("/api/dashboard/stats", fetcher);
  const { data: pendingData } = useSWR(
    "/api/approvals?status=pending_professor&limit=5",
    fetcher,
  );
  const { data: bookingsData } = useSWR("/api/bookings?limit=5", fetcher);

  const stats = statsData || {
    total_bookings: 0,
    pending_bookings: 0,
    approved_bookings: 0,
    pending_approvals: 0,
  };

  const pendingApprovals: Booking[] = pendingData?.bookings || [];
  const recentBookings: Booking[] = bookingsData?.bookings || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Approvals</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.pending_approvals || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <CalendarDays className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Bookings</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.total_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.approved_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Bookings</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.pending_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">
              Pending Approval Requests
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/approvals">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No pending requests
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((booking) => (
                  <div
                    key={booking._id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {booking.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.requester?.name || "Student"} |{" "}
                        {new Date(booking.startAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">Pending (Prof)</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">
              My Recent Bookings
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/bookings">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No bookings yet</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/book">Book a Venue</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {booking.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.startAt).toLocaleDateString()} |{" "}
                        {new Date(booking.startAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(booking.endAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        booking.status === "approved" ? "default" : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
