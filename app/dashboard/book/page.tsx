"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building2, CalendarDays, Clock, Users, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import type { Venue } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BookVenuePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const preselectedVenue = searchParams.get("venue")

  const [step, setStep] = useState(1)
  const [selectedVenueId, setSelectedVenueId] = useState(preselectedVenue || "")
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    start_time: "",
    end_time: "",
    attendees_count: "",
    purpose: "",
  })

  const { data: venuesData } = useSWR("/api/venues", fetcher)
  const venues: Venue[] = venuesData?.venues || []
  const selectedVenue = venues.find((v) => v._id === selectedVenueId)

  useEffect(() => {
    if (preselectedVenue) {
      setStep(2)
    }
  }, [preselectedVenue])

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!selectedVenueId) {
      toast.error("Please select a venue")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: selectedVenueId,
          ...form,
          attendees_count: parseInt(form.attendees_count) || 1,
        }),
      })
      if (res.ok) {
        toast.success("Booking submitted successfully!")
        router.push("/dashboard/bookings")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to create booking")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <DashboardHeader title="Book a Venue" description="Reserve a campus space in 3 simple steps" />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          {/* Step indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {[
              { num: 1, label: "Select Venue" },
              { num: 2, label: "Details" },
              { num: 3, label: "Confirm" },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                    step >= s.num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={`hidden text-sm font-medium md:inline ${
                    step >= s.num ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < 2 && <div className="mx-2 h-px w-8 bg-border md:w-16" />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Venue */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Select a Venue</CardTitle>
                <CardDescription>Choose the space you want to book</CardDescription>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No venues available</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {venues.map((venue) => (
                      <button
                        type="button"
                        key={venue._id}
                        onClick={() => setSelectedVenueId(venue._id)}
                        className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                          selectedVenueId === venue._id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{venue.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {venue.building} | Capacity: {venue.capacity}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button disabled={!selectedVenueId} onClick={() => setStep(2)} className="gap-2">
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Booking Details */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Booking Details</CardTitle>
                <CardDescription>
                  Fill in the details for your reservation
                  {selectedVenue && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedVenue.name}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Booking Title</Label>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => updateForm("date", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={form.start_time}
                      onChange={(e) => updateForm("start_time", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={form.end_time}
                      onChange={(e) => updateForm("end_time", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="attendees">Number of Attendees</Label>
                    <Input
                      id="attendees"
                      type="number"
                      placeholder="e.g. 30"
                      value={form.attendees_count}
                      onChange={(e) => updateForm("attendees_count", e.target.value)}
                      min={1}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Select value={form.purpose} onValueChange={(v) => updateForm("purpose", v)}>
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
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!form.title || !form.date || !form.start_time || !form.end_time || !form.purpose}
                    className="gap-2"
                  >
                    Review
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Confirm Booking</CardTitle>
                <CardDescription>Review your booking details before submitting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-muted/30 p-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Venue</p>
                        <p className="font-medium text-foreground">{selectedVenue?.name || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="font-medium text-foreground">
                          {form.date} | {form.start_time} - {form.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Attendees</p>
                        <p className="font-medium text-foreground">{form.attendees_count}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Purpose</p>
                        <p className="font-medium capitalize text-foreground">{form.purpose.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">{form.title}</p>
                    {form.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                    {loading ? "Submitting..." : "Submit Booking"}
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
