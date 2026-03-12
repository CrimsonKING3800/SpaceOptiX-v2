"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CalendarDays,
  Users,
  ClipboardCheck,
  ScrollText,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { Booking } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AdminDashboard() {
  const { data: statsData } = useSWR("/api/dashboard/stats", fetcher);
  const { data: recentData } = useSWR(
    "/api/bookings?limit=5&all=true",
    fetcher,
  );

  const stats = statsData || {
    total_bookings: 0,
    pending_bookings: 0,
    approved_bookings: 0,
    total_venues: 0,
    total_users: 0,
    upcoming_bookings: 0,
  };

  const recentBookings: Booking[] = recentData?.bookings || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bookings</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {stats.total_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {stats.pending_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {stats.approved_bookings}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Venues</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {stats.total_venues}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {stats.total_users}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="font-heading text-xl font-bold text-foreground">
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
              <p className="py-8 text-center text-sm text-muted-foreground">
                No bookings yet
              </p>
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
                        {booking.requester?.name || "User"} |{" "}
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
                        booking.status === "approved"
                          ? "default"
                          : booking.status === "rejected"
                            ? "destructive"
                            : "secondary"
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

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" asChild>
              <Link href="/dashboard/venues">
                <Building2 className="h-4 w-4" />
                Manage Venues
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
              asChild
            >
              <Link href="/dashboard/approvals">
                <ClipboardCheck className="h-4 w-4" />
                Review Approvals
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
              asChild
            >
              <Link href="/dashboard/users">
                <Users className="h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
              asChild
            >
              <Link href="/dashboard/audit">
                <ScrollText className="h-4 w-4" />
                View Audit Logs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
