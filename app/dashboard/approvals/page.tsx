"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/lib/auth-context";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  CalendarDays,
  Clock,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
  draft: { variant: "outline", label: "Draft" },
  pending_professor: { variant: "secondary", label: "Pending (Prof)" },
  pending_admin: { variant: "secondary", label: "Pending (Admin)" },
  approved: { variant: "default", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const statusFilterValue =
    statusFilter === "pending"
      ? isAdmin
        ? "pending_admin"
        : "pending_professor"
      : statusFilter;
  const apiUrl = "/api/approvals";
  const { data } = useSWR(`${apiUrl}?status=${statusFilterValue}`, fetcher);
  const bookings: Booking[] = data?.bookings || [];

  const handleAction = async () => {
    if (!selectedBooking || !action) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: isAdmin ? "admin" : "professor",
          action: action === "approve" ? "approve" : "reject",
          comments,
        }),
      });
      if (res.ok) {
        toast.success(
          `Booking ${action === "approve" ? "approved" : "rejected"} successfully`,
        );
        mutate(`${apiUrl}?status=${statusFilterValue}`);
        mutate("/api/dashboard/stats");
        setSelectedBooking(null);
        setAction(null);
        setComments("");
      } else {
        toast.error("Failed to process approval");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <DashboardHeader
        title={isAdmin ? "All Approvals" : "Approval Requests"}
        description={
          isAdmin
            ? "Manage all booking approvals"
            : "Review and approve student booking requests"
        }
      />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">To Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {bookings.length} request{bookings.length !== 1 ? "s" : ""}
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <ClipboardCheck className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">
              No {statusFilter} requests
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "pending"
                ? "All caught up! No pending approvals."
                : "No requests with this status."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const cfg =
                statusConfig[booking.status] || statusConfig.pending_professor;
              return (
                <Card key={booking._id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {booking.requester?.name || "Student"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {new Date(booking.startAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(booking.startAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}{" "}
                              -{" "}
                              {new Date(booking.endAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {booking.description && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {booking.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {(booking.status === "pending_professor" ||
                        booking.status === "pending_admin") && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setAction("approve");
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setAction("reject");
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog
          open={!!selectedBooking && !!action}
          onOpenChange={() => {
            setSelectedBooking(null);
            setAction(null);
            setComments("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">
                {action === "approve" ? "Approve Booking" : "Reject Booking"}
              </DialogTitle>
              <DialogDescription>
                {action === "approve"
                  ? `Approve "${selectedBooking?.title}" booking request?`
                  : `Reject "${selectedBooking?.title}" booking request?`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Textarea
                placeholder={
                  action === "reject"
                    ? "Reason for rejection (required)..."
                    : "Comments (optional)..."
                }
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBooking(null);
                  setAction(null);
                  setComments("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={loading || (action === "reject" && !comments)}
                variant={action === "reject" ? "destructive" : "default"}
              >
                {loading
                  ? "Processing..."
                  : action === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
