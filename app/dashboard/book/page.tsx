"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  MapPin,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Venue } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SlotBooking {
  startAt: string;
  endAt: string;
  title: string;
  status: string;
}

interface AvailabilityData {
  venue: {
    _id: string;
    name: string;
    availability_hours: { start: string; end: string };
  };
  bookings: SlotBooking[];
}

type HourStatus = "free" | "booked" | "past" | "outside";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const VENUE_TYPE_LABELS: Record<string, string> = {
  classroom: "Classroom",
  lab: "Lab",
  auditorium: "Auditorium",
  conference_room: "Conference Room",
  sports_facility: "Sports Facility",
  open_area: "Open Area",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookVenuePage() {
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Event details
  const [form, setForm] = useState({
    title: "",
    description: "",
    attendees_count: "",
    purpose: "",
  });

  // Step 2: Venue selection
  const [venueTypeFilter, setVenueTypeFilter] = useState("all");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
  const selectedVenue = venues.find((v) => v._id === selectedVenueId);
  const filteredBookingVenues = useMemo(() => {
    if (!venueSearch.trim()) return venues;
    const q = venueSearch.toLowerCase();
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.building.toLowerCase().includes(q),
    );
  }, [venues, venueSearch]);

  // Step 3: Calendar slot picker
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);

  // ─── Form helpers ──────────────────────────────────────────────────

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isStep1Valid = form.title && form.attendees_count && form.purpose;

  // ─── Step 2: Fetch venues when filters change ──────────────────────

  const fetchVenues = useCallback(async () => {
    setVenuesLoading(true);
    try {
      const params = new URLSearchParams();
      if (venueTypeFilter && venueTypeFilter !== "all") {
        params.set("type", venueTypeFilter);
      }
      const count = parseInt(form.attendees_count);
      if (count > 0) {
        params.set("capacity_min", String(count));
      }
      const res = await fetch(`/api/venues/search?${params.toString()}`);
      const data = await res.json();
      setVenues(data.venues || []);
    } catch {
      toast.error("Failed to load venues");
    } finally {
      setVenuesLoading(false);
    }
  }, [venueTypeFilter, form.attendees_count]);

  useEffect(() => {
    if (step === 2) {
      fetchVenues();
    }
  }, [step, fetchVenues]);

  // ─── Step 3: Fetch availability when venue or month changes ────────

  const fetchAvailability = useCallback(async () => {
    if (!selectedVenueId) return;
    setAvailLoading(true);
    try {
      const startDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
      const daysInMonth = getDaysInMonth(calYear, calMonth);
      const endDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const res = await fetch(
        `/api/venues/${selectedVenueId}/slots?start=${startDate}&end=${endDate}`,
      );
      const data = await res.json();
      setAvailability(data);
    } catch {
      toast.error("Failed to load availability");
    } finally {
      setAvailLoading(false);
    }
  }, [selectedVenueId, calYear, calMonth]);

  useEffect(() => {
    if (step === 3) {
      fetchAvailability();
      setSelectedDate(null);
      setSelectedStart(null);
      setSelectedEnd(null);
    }
  }, [step, fetchAvailability]);

  // ─── Calendar logic ────────────────────────────────────────────────

  const getDateStatus = useCallback(
    (day: number): "past" | "has-bookings" | "free" => {
      const date = new Date(calYear, calMonth, day);
      if (date < today) return "past";
      if (!availability) return "free";

      const dayStart = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`;
      const dayEnd = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:59.999Z`;

      const hasBooking = availability.bookings.some(
        (b) => b.startAt < dayEnd && b.endAt > dayStart,
      );

      if (hasBooking) return "has-bookings";
      return "free";
    },
    [calYear, calMonth, today, availability],
  );

  const getHourStatuses = useCallback((): HourStatus[] => {
    if (!selectedDate || !availability) return [];

    const hours: HourStatus[] = [];
    const opStart = parseInt(availability.venue.availability_hours.start.split(":")[0], 10);
    const opEnd = parseInt(availability.venue.availability_hours.end.split(":")[0], 10);

    const now = new Date();

    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(`${selectedDate}T${String(h).padStart(2, "0")}:00:00`);
      const hourEnd = new Date(`${selectedDate}T${String(h + 1 === 24 ? 23 : h + 1).padStart(2, "0")}:${h + 1 === 24 ? "59" : "00"}:00`);

      // Past hours
      if (hourEnd <= now) {
        hours.push("past");
        continue;
      }

      // Outside operating hours
      if (h < opStart || h >= opEnd) {
        hours.push("outside");
        continue;
      }

      const hourStartISO = hourStart.toISOString();
      const hourEndISO = hourEnd.toISOString();



      // Check booking overlap
      const isBooked = availability.bookings.some(
        (b) => b.startAt < hourEndISO && b.endAt > hourStartISO,
      );
      if (isBooked) {
        hours.push("booked");
        continue;
      }

      hours.push("free");
    }
    return hours;
  }, [selectedDate, availability]);

  const hourStatuses = useMemo(() => getHourStatuses(), [getHourStatuses]);

  const handleHourClick = (hour: number) => {
    if (hourStatuses[hour] !== "free") return;

    if (selectedStart === null || selectedEnd !== null) {
      // Start new selection
      setSelectedStart(hour);
      setSelectedEnd(null);
    } else {
      // Complete selection — validate all hours in range are free
      const start = Math.min(selectedStart, hour);
      const end = Math.max(selectedStart, hour);
      const allFree = Array.from({ length: end - start + 1 }, (_, i) => start + i).every(
        (h) => hourStatuses[h] === "free",
      );
      if (!allFree) {
        toast.error("Selection includes unavailable slots. Pick a contiguous free range.");
        setSelectedStart(null);
        setSelectedEnd(null);
        return;
      }
      setSelectedStart(start);
      setSelectedEnd(end);
    }
  };

  const isStep3Valid = selectedDate && selectedStart !== null && selectedEnd !== null;

  const buildTimeString = (date: string, hour: number, isEnd?: boolean) => {
    const h = isEnd ? hour + 1 : hour;
    if (h >= 24) {
      return `${date}T23:59:00`;
    }
    return `${date}T${String(h).padStart(2, "0")}:00:00`;
  };

  // ─── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedVenueId || !selectedDate || selectedStart === null || selectedEnd === null) {
      toast.error("Missing required information");
      return;
    }
    setLoading(true);
    try {
      const startAt = buildTimeString(selectedDate, selectedStart);
      const endAt = buildTimeString(selectedDate, selectedEnd, true);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: selectedVenueId,
          title: form.title,
          description: form.description || undefined,
          startAt,
          endAt,
          attendees_count: parseInt(form.attendees_count) || 1,
          purpose: form.purpose,
        }),
      });
      if (res.ok) {
        toast.success("Booking created successfully!");
        router.push("/dashboard/bookings");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create booking");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Navigation ────────────────────────────────────────────────────

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  const steps = [
    { num: 1, label: "Event Details", icon: FileText },
    { num: 2, label: "Select Venue", icon: Building2 },
    { num: 3, label: "Pick Time", icon: CalendarDays },
    { num: 4, label: "Confirm", icon: CheckCircle2 },
  ];

  return (
    <div>
      <DashboardHeader
        title="Book a Venue"
        description="Reserve a campus space in 4 simple steps"
      />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          {/* ─── Step Indicator ─── */}
          <div className="mb-8 flex items-center justify-center gap-1 sm:gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-1 sm:gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all ${step > s.num
                      ? "bg-green-500/90 text-white"
                      : step === s.num
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {step > s.num ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`hidden text-xs font-medium md:block ${step >= s.num ? "text-foreground" : "text-muted-foreground"
                      }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-1 h-px w-6 sm:w-10 md:w-16 transition-colors ${step > s.num ? "bg-green-500/60" : "bg-border"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ═══════════════ STEP 1: Event Details ═══════════════ */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Event Details
                </CardTitle>
                <CardDescription>
                  Tell us about your event — we&apos;ll find matching venues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Booking Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Group Study Session"
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your event..."
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="attendees">Number of Attendees *</Label>
                    <Input
                      id="attendees"
                      type="number"
                      placeholder="e.g. 30"
                      value={form.attendees_count}
                      onChange={(e) =>
                        updateForm("attendees_count", e.target.value)
                      }
                      min={1}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose *</Label>
                    <Select
                      value={form.purpose}
                      onValueChange={(v) => updateForm("purpose", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lecture">Lecture</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="study_group">Study Group</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    disabled={!isStep1Valid}
                    onClick={() => setStep(2)}
                    className="gap-2"
                  >
                    Find Venues
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════ STEP 2: Select Venue ═══════════════ */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Select a Venue
                </CardTitle>
                <CardDescription>
                  Venues matching {form.attendees_count}+ capacity
                  {venueTypeFilter !== "all" &&
                    ` • ${VENUE_TYPE_LABELS[venueTypeFilter] || venueTypeFilter}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filter bar */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search venues by name or building..."
                      className="pl-10"
                      value={venueSearch}
                      onChange={(e) => setVenueSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="shrink-0 text-sm">Type:</Label>
                    <Select
                      value={venueTypeFilter}
                      onValueChange={(v) => {
                        setVenueTypeFilter(v);
                        setSelectedVenueId("");
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(VENUE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Venues grid — scrollable, shows ~10 items */}
                {venuesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredBookingVenues.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No venues match your criteria. Try a different search or type.
                  </p>
                ) : (
                  <div className="max-h-[540px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {filteredBookingVenues.map((venue) => (
                        <button
                          type="button"
                          key={venue._id}
                          onClick={() => setSelectedVenueId(venue._id)}
                          className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                            selectedVenueId === venue._id
                              ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                              : "border-border hover:border-primary/30 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {venue.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {venue.building}, Floor {venue.floor}
                              </span>
                            </p>
                            <div className="mt-1 flex gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Users className="mr-1 h-3 w-3" />
                                {venue.capacity}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {VENUE_TYPE_LABELS[venue.type] || venue.type}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    disabled={!selectedVenueId}
                    onClick={() => setStep(3)}
                    className="gap-2"
                  >
                    Pick Time
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════ STEP 3: Calendar Slot Picker ═══════════════ */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Pick a Time Slot
                </CardTitle>
                <CardDescription>
                  {selectedVenue && (
                    <Badge variant="secondary" className="mr-2">
                      {selectedVenue.name}
                    </Badge>
                  )}
                  Select a date, then choose your time range
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="mb-4 flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-sm bg-green-500/80" />
                    Free
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-sm bg-orange-500/80" />
                    Booked
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
                    Unavailable
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-sm bg-primary/80" />
                    Selected
                  </span>
                </div>

                {/* Calendar month nav */}
                <div className="mb-3 flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {availLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div key={d} className="py-1">
                            {d}
                          </div>
                        ),
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells before first day */}
                      {Array.from(
                        { length: getFirstDayOfWeek(calYear, calMonth) },
                        (_, i) => (
                          <div key={`empty-${i}`} />
                        ),
                      )}
                      {/* Day cells */}
                      {Array.from(
                        { length: getDaysInMonth(calYear, calMonth) },
                        (_, i) => {
                          const day = i + 1;
                          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const status = getDateStatus(day);
                          const isSelected = selectedDate === dateStr;

                          let bgClass = "";
                          if (isSelected) {
                            bgClass = "bg-primary text-primary-foreground shadow-md";
                          } else if (status === "past") {
                            bgClass =
                              "bg-muted/60 text-muted-foreground cursor-not-allowed opacity-50";
                          } else if (status === "has-bookings") {
                            bgClass =
                              "bg-orange-500/10 text-foreground hover:bg-orange-500/20 cursor-pointer";
                          } else {
                            bgClass =
                              "bg-green-500/10 text-foreground hover:bg-green-500/20 cursor-pointer";
                          }

                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={status === "past"}
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setSelectedStart(null);
                                setSelectedEnd(null);
                              }}
                              className={`relative flex h-10 items-center justify-center rounded-md text-sm font-medium transition-all ${bgClass}`}
                            >
                              {day}
                              {/* Status dot */}
                              {status !== "past" && !isSelected && (
                                <span
                                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${status === "has-bookings"
                                    ? "bg-orange-500"
                                    : "bg-green-500"
                                    }`}
                                />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>

                    {/* ─── Expanded time slots for selected date ─── */}
                    {selectedDate && (
                      <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
                        <p className="mb-3 text-sm font-semibold text-foreground">
                          <Clock className="mr-1 inline h-4 w-4 text-primary" />
                          {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                            undefined,
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>

                        {selectedStart !== null && selectedEnd !== null && (
                          <p className="mb-3 text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Selected: {String(selectedStart).padStart(2, "0")}
                            :00 – {String(selectedEnd + 1 >= 24 ? 23 : selectedEnd + 1).padStart(2, "0")}
                            :{selectedEnd + 1 >= 24 ? "59" : "00"}
                          </p>
                        )}
                        {selectedStart !== null && selectedEnd === null && (
                          <p className="mb-3 text-xs text-primary font-medium">
                            Start: {String(selectedStart).padStart(2, "0")}:00 — now click an end hour
                          </p>
                        )}

                        <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-12">
                          {hourStatuses.map((status, hour) => {
                            const isSelStart =
                              selectedStart !== null &&
                              selectedEnd === null &&
                              hour === selectedStart;
                            const isInSelection =
                              selectedStart !== null &&
                              selectedEnd !== null &&
                              hour >= selectedStart &&
                              hour <= selectedEnd;

                            let cellBg = "";
                            if (isInSelection || isSelStart) {
                              cellBg =
                                "bg-primary text-primary-foreground ring-1 ring-primary/50";
                            } else if (status === "free") {
                              cellBg =
                                "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/30 cursor-pointer";
                            } else if (status === "booked") {
                              cellBg =
                                "bg-orange-500/15 text-orange-700 dark:text-orange-400 cursor-not-allowed";

                            } else {
                              cellBg =
                                "bg-muted text-muted-foreground cursor-not-allowed opacity-50";
                            }

                            return (
                              <button
                                key={hour}
                                type="button"
                                disabled={status !== "free" && !isInSelection && !isSelStart}
                                onClick={() => handleHourClick(hour)}
                                className={`flex h-9 items-center justify-center rounded text-xs font-medium transition-all ${cellBg}`}
                                title={`${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00 (${status})`}
                              >
                                {String(hour).padStart(2, "0")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    disabled={!isStep3Valid}
                    onClick={() => setStep(4)}
                    className="gap-2"
                  >
                    Review
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════ STEP 4: Confirmation ═══════════════ */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Confirm Booking
                </CardTitle>
                <CardDescription>
                  Review your booking details before submitting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-muted/30 p-5">
                  <div className="space-y-4">
                    {/* Title & Description */}
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Event Title
                        </p>
                        <p className="font-medium text-foreground">
                          {form.title}
                        </p>
                        {form.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Venue */}
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Venue</p>
                        <p className="font-medium text-foreground">
                          {selectedVenue?.name || "N/A"}
                        </p>
                        {selectedVenue && (
                          <p className="text-xs text-muted-foreground">
                            {selectedVenue.building}, Floor{" "}
                            {selectedVenue.floor}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Date & Time */}
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Date & Time
                        </p>
                        <p className="font-medium text-foreground">
                          {selectedDate &&
                            new Date(
                              selectedDate + "T00:00:00",
                            ).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                        </p>
                        <p className="text-sm text-foreground">
                          {selectedStart !== null && selectedEnd !== null && (
                            <>
                              {String(selectedStart).padStart(2, "0")}:00 –{" "}
                              {String(
                                selectedEnd + 1 >= 24 ? 23 : selectedEnd + 1,
                              ).padStart(2, "0")}
                              :{selectedEnd + 1 >= 24 ? "59" : "00"}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Attendees */}
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Attendees
                        </p>
                        <p className="font-medium text-foreground">
                          {form.attendees_count}
                        </p>
                      </div>
                    </div>
                    {/* Purpose */}
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Purpose</p>
                        <p className="font-medium capitalize text-foreground">
                          {form.purpose.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Booking
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
