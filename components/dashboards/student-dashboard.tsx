"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Booking } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  draft: { variant: "outline", label: "Draft" },
  pending_professor: { variant: "secondary", label: "Pending (Prof)" },
  pending_admin: { variant: "secondary", label: "Pending (Admin)" },
  approved: { variant: "default", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

export function StudentDashboard() {
  const { data: statsData } = useSWR("/api/dashboard/stats", fetcher);
  const { data: bookingsData } = useSWR("/api/bookings?limit=5", fetcher);

  const stats = statsData || {
    total_bookings: 0,
    pending_bookings: 0,
    approved_bookings: 0,
    upcoming_bookings: 0,
  };

  const recentBookings: Booking[] = bookingsData?.bookings || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.total_bookings}
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
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.pending_bookings}
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="font-heading text-2xl font-bold text-foreground">
                {stats.upcoming_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">
              Recent Bookings
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/bookings">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No bookings yet</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/book">Book a Venue</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => {
                  const cfg =
                    statusConfig[booking.status] ||
                    statusConfig.pending_professor;
                  return (
                    <div
                      key={booking._id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
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
                      </div>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" asChild>
              <Link href="/dashboard/book">
                <Building2 className="h-4 w-4" />
                Book a Venue
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
              asChild
            >
              <Link href="/dashboard/venues">
                <CalendarDays className="h-4 w-4" />
                Explore Venues
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
              asChild
            >
              <Link href="/dashboard/bookings">
                <Clock className="h-4 w-4" />
                View My Bookings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
